package controllers_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"si-digi-rtrw-backend/config"
	"si-digi-rtrw-backend/controllers"
	"si-digi-rtrw-backend/models"

	"github.com/gin-gonic/gin"
)

func TestGetMyFamilyEndpoint(t *testing.T) {
	setupTestDB()
	gin.SetMode(gin.TestMode)

	// Create family
	fam := models.Family{NoKK: "999888777", Address: "Blok Z"}
	config.DB.Create(&fam)

	// Seed residents in family
	res1 := models.Resident{FullName: "Bapak Budi", FamilyID: fam.ID, NIK: "1111", RT: "01", RW: "03", DateOfBirth: time.Now()}
	res2 := models.Resident{FullName: "Ibu Ani", FamilyID: fam.ID, NIK: "2222", RT: "01", RW: "03", DateOfBirth: time.Now()}
	config.DB.Create(&res1)
	config.DB.Create(&res2)

	// Create user linked to Bapak Budi
	user := models.User{Username: "budi", Password: "pwd", Role: "Warga", ResidentID: res1.ID}
	config.DB.Create(&user)

	r := gin.New()
	r.GET("/api/my-family", func(c *gin.Context) {
		c.Set("user_id", float64(user.ID))
		controllers.GetMyFamily(c)
	})

	req, _ := http.NewRequest("GET", "/api/my-family", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected 200, got %d", w.Code)
	}

	var list []models.Resident
	json.Unmarshal(w.Body.Bytes(), &list)
	if len(list) != 2 {
		t.Fatalf("Expected 2 family members, got %d", len(list))
	}
}

func TestGetMyFamilyEndpoint_NotLinked(t *testing.T) {
	setupTestDB()
	gin.SetMode(gin.TestMode)

	// Create user with ResidentID = 0 (bypassing FK constraints in transaction)
	tx := config.DB.Begin()
	tx.Exec("SET FOREIGN_KEY_CHECKS = 0;")
	user := models.User{Username: "budi", Password: "pwd", Role: "Warga", ResidentID: 0}
	tx.Create(&user)
	tx.Exec("SET FOREIGN_KEY_CHECKS = 1;")
	tx.Commit()

	r := gin.New()
	r.GET("/api/my-family", func(c *gin.Context) {
		c.Set("user_id", float64(user.ID))
		controllers.GetMyFamily(c)
	})

	req, _ := http.NewRequest("GET", "/api/my-family", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("Expected 400 Bad Request, got %d", w.Code)
	}
}

func TestGetMyFamilyEndpoint_NoFamilyID(t *testing.T) {
	setupTestDB()
	gin.SetMode(gin.TestMode)

	// Seed resident without family and linked user (bypassing FK constraints in transaction)
	tx := config.DB.Begin()
	tx.Exec("SET FOREIGN_KEY_CHECKS = 0;")
	res := models.Resident{FullName: "Bapak Budi", FamilyID: 0, NIK: "1111", RT: "01", RW: "03", DateOfBirth: time.Now()}
	tx.Create(&res)
	user := models.User{Username: "budi", Password: "pwd", Role: "Warga", ResidentID: res.ID}
	tx.Create(&user)
	tx.Exec("SET FOREIGN_KEY_CHECKS = 1;")
	tx.Commit()

	r := gin.New()
	r.GET("/api/my-family", func(c *gin.Context) {
		c.Set("user_id", float64(user.ID))
		controllers.GetMyFamily(c)
	})

	req, _ := http.NewRequest("GET", "/api/my-family", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected 200, got %d", w.Code)
	}

	var list []models.Resident
	json.Unmarshal(w.Body.Bytes(), &list)
	if len(list) != 1 {
		t.Fatalf("Expected 1 family member, got %d", len(list))
	}

	if list[0].FullName != "Bapak Budi" {
		t.Fatalf("Expected list to contain Bapak Budi, got %s", list[0].FullName)
	}
}

