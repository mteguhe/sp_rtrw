package controllers_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"si-digi-rtrw-backend/config"
	"si-digi-rtrw-backend/controllers"
	"si-digi-rtrw-backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func setupTestDB() {
	// Try connecting using Docker credentials, then fallback to local host credentials
	dsn := "root:rootpassword@tcp(127.0.0.1:3306)/si_digi_rtrw_test?charset=utf8mb4&parseTime=True&loc=Local"
	var err error
	config.DB, err = gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		dsn = "root:root@tcp(127.0.0.1:3306)/si_digi_rtrw_test?charset=utf8mb4&parseTime=True&loc=Local"
		config.DB, err = gorm.Open(mysql.Open(dsn), &gorm.Config{})
		if err != nil {
			panic("Failed to connect to test database. Ensure MySQL is running on port 3306 and si_digi_rtrw_test database exists: " + err.Error())
		}
	}
	config.DB.AutoMigrate(&models.Family{}, &models.Resident{})
	config.DB.Unscoped().Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&models.Resident{})
	config.DB.Unscoped().Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&models.Family{})
}

func TestGetResidentsIsolation(t *testing.T) {
	setupTestDB()
	gin.SetMode(gin.TestMode)

	// Seed a family
	fam := models.Family{NoKK: "1234567890123456", Address: "Jl. Merdeka", RT: "01", RW: "03"}
	config.DB.Create(&fam)

	// Seed residents from different RTs associated with the family
	res1 := models.Resident{FullName: "Resident RT 01", RT: "01", RW: "03", NIK: "111", DateOfBirth: time.Now(), FamilyID: fam.ID}
	res2 := models.Resident{FullName: "Resident RT 02", RT: "02", RW: "03", NIK: "222", DateOfBirth: time.Now(), FamilyID: fam.ID}
	config.DB.Create(&res1)
	config.DB.Create(&res2)

	r := gin.New()
	r.GET("/rt/residents", func(c *gin.Context) {
		c.Set("role", "Admin RT")
		c.Set("rt", "01")
		c.Set("rw", "03")
		controllers.GetResidents(c)
	})

	req, _ := http.NewRequest("GET", "/rt/residents", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected 200, got %d", w.Code)
	}

	var list []models.Resident
	json.Unmarshal(w.Body.Bytes(), &list)

	if len(list) != 1 {
		t.Fatalf("Expected 1 resident (RT 01 only), got %d", len(list))
	}

	if list[0].FullName != "Resident RT 01" {
		t.Errorf("Expected Resident RT 01, got %s", list[0].FullName)
	}
}

func TestCreateResidentIsolation(t *testing.T) {
	setupTestDB()
	gin.SetMode(gin.TestMode)

	// Seed family from RT 02
	famRT02 := models.Family{NoKK: "2222222222222222", Address: "Jl. RT02", RT: "02", RW: "03"}
	config.DB.Create(&famRT02)

	r := gin.New()
	r.POST("/rt/residents", func(c *gin.Context) {
		c.Set("role", "Admin RT")
		c.Set("rt", "01")
		c.Set("rw", "03")
		controllers.CreateResident(c)
	})

	// Test 1: Try creating resident linked to family in different RT (should fail with 403)
	payload1 := map[string]interface{}{
		"nik":           "333",
		"full_name":     "Resident Mismatch",
		"family_id":     famRT02.ID,
		"date_of_birth": "2000-01-01T00:00:00Z",
	}
	body1, _ := json.Marshal(payload1)
	req1, _ := http.NewRequest("POST", "/rt/residents", bytes.NewBuffer(body1))
	req1.Header.Set("Content-Type", "application/json")
	w1 := httptest.NewRecorder()
	r.ServeHTTP(w1, req1)

	if w1.Code != http.StatusForbidden {
		t.Errorf("Expected 403 Forbidden when linking to family in different RT, got %d", w1.Code)
	}

	// Seed family from RT 01
	famRT01 := models.Family{NoKK: "1111111111111111", Address: "Jl. RT01", RT: "01", RW: "03"}
	config.DB.Create(&famRT01)

	// Test 2: Create valid resident (should pass and force RT/RW to Admin's RT/RW)
	payload2 := map[string]interface{}{
		"nik":           "444",
		"full_name":     "Resident Valid",
		"family_id":     famRT01.ID,
		"date_of_birth": "2000-01-01T00:00:00Z",
	}
	body2, _ := json.Marshal(payload2)
	req2, _ := http.NewRequest("POST", "/rt/residents", bytes.NewBuffer(body2))
	req2.Header.Set("Content-Type", "application/json")
	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, req2)

	if w2.Code != http.StatusCreated {
		t.Fatalf("Expected 201 Created, got %d. Response: %s", w2.Code, w2.Body.String())
	}

	var created models.Resident
	json.Unmarshal(w2.Body.Bytes(), &created)

	if created.RT != "01" || created.RW != "03" {
		t.Errorf("Expected created resident RT=01, RW=03, got RT=%s, RW=%s", created.RT, created.RW)
	}
}

func TestGetFamiliesIsolationAndPreload(t *testing.T) {
	setupTestDB()
	gin.SetMode(gin.TestMode)

	// Seed families
	fam1 := models.Family{NoKK: "1111", RT: "01", RW: "03"}
	fam2 := models.Family{NoKK: "2222", RT: "02", RW: "03"}
	config.DB.Create(&fam1)
	config.DB.Create(&fam2)

	// Seed residents (one scoped, one cross-scoped linked to fam1 to test preload filtering)
	resScoped := models.Resident{FullName: "Scoped", RT: "01", RW: "03", NIK: "111", FamilyID: fam1.ID, DateOfBirth: time.Now()}
	resUnscoped := models.Resident{FullName: "Cross Scope Leak", RT: "02", RW: "03", NIK: "222", FamilyID: fam1.ID, DateOfBirth: time.Now()}
	config.DB.Create(&resScoped)
	config.DB.Create(&resUnscoped)

	r := gin.New()
	r.GET("/rt/families", func(c *gin.Context) {
		c.Set("role", "Admin RT")
		c.Set("rt", "01")
		c.Set("rw", "03")
		controllers.GetFamilies(c)
	})

	req, _ := http.NewRequest("GET", "/rt/families", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected 200, got %d", w.Code)
	}

	var families []models.Family
	json.Unmarshal(w.Body.Bytes(), &families)

	if len(families) != 1 {
		t.Fatalf("Expected 1 family matching scope, got %d", len(families))
	}

	if len(families[0].Residents) != 1 {
		t.Fatalf("Expected only 1 preloaded resident inside family due to RT/RW scope filtering, got %d", len(families[0].Residents))
	}

	if families[0].Residents[0].FullName != "Scoped" {
		t.Errorf("Expected preloaded resident to be 'Scoped', got '%s'", families[0].Residents[0].FullName)
	}
}

func TestCreateFamilyNestedIsolation(t *testing.T) {
	setupTestDB()
	gin.SetMode(gin.TestMode)

	r := gin.New()
	r.POST("/rt/families", func(c *gin.Context) {
		c.Set("role", "Admin RT")
		c.Set("rt", "01")
		c.Set("rw", "03")
		controllers.CreateFamily(c)
	})

	// Create family with nested residents specifying other/empty RT/RW
	payload := map[string]interface{}{
		"no_kk":   "9999",
		"address": "Jl. Test nested",
		"residents": []map[string]interface{}{
			{
				"nik":           "555",
				"full_name":     "Nested Resident 1",
				"rt":            "02", // mismatched RT
				"rw":            "04", // mismatched RW
				"date_of_birth": "2000-01-01T00:00:00Z",
			},
		},
	}
	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", "/rt/families", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("Expected 201 Created, got %d. Response: %s", w.Code, w.Body.String())
	}

	var created models.Family
	config.DB.Preload("Residents").First(&created, "no_kk = ?", "9999")

	if created.RT != "01" || created.RW != "03" {
		t.Errorf("Expected family RT=01, RW=03, got RT=%s, RW=%s", created.RT, created.RW)
	}

	if len(created.Residents) != 1 {
		t.Fatalf("Expected 1 nested resident, got %d", len(created.Residents))
	}

	nested := created.Residents[0]
	if nested.RT != "01" || nested.RW != "03" {
		t.Errorf("Expected nested resident RT=01, RW=03 (forced scope), got RT=%s, RW=%s", nested.RT, nested.RW)
	}
}
