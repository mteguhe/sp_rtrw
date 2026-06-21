# Backend Data Isolation & Multi-Tenancy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement RT/RW-based data isolation (multi-tenancy) in the backend API to ensure that residents, finance records, announcements, and letters are only accessible and mutable by users within their respective administrative jurisdictions.

**Architecture:** Extend JWT token claims during login to include the user's `rt` and `rw` values. Extract these claims in `AuthMiddleware` and store them in the Gin context. Modify controllers to filter all read and write queries using the context's `rt` and `rw` values.

**Tech Stack:** Go (Golang), Gin, GORM, JWT.

---

### Task 1: Extend JWT Authentication and Middleware with RT/RW Claims

**Files:**
- Modify: `projects/si-digi-rtrw/backend/controllers/auth_controller.go`
- Modify: `projects/si-digi-rtrw/backend/middleware/jwt_middleware.go`
- Create: `projects/si-digi-rtrw/backend/middleware/jwt_middleware_test.go`

- [ ] **Step 1: Write failing JWT middleware test**
  Create `projects/si-digi-rtrw/backend/middleware/jwt_middleware_test.go` containing:
  ```go
  package middleware_test

  import (
  	"net/http"
  	"net/http/httptest"
  	"os"
  	"testing"
  	"time"

  	"si-digi-rtrw-backend/middleware"

  	"github.com/gin-gonic/gin"
  	"github.com/golang-jwt/jwt/v5"
  )

  func TestAuthMiddlewareExtractsRTRW(t *testing.T) {
  	os.Setenv("JWT_SECRET", "mytestsecret")
  	gin.SetMode(gin.TestMode)

  	r := gin.New()
  	r.Use(middleware.AuthMiddleware())
  	r.GET("/test-claims", func(c *gin.Context) {
  		userID, _ := c.Get("user_id")
  		role, _ := c.Get("role")
  		rt, _ := c.Get("rt")
  		rw, _ := c.Get("rw")
  		c.JSON(http.StatusOK, gin.H{
  			"user_id": userID,
  			"role":    role,
  			"rt":      rt,
  			"rw":      rw,
  		})
  	})

  	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
  		"user_id": float64(10),
  		"role":    "Admin RT",
  		"rt":      "02",
  		"rw":      "04",
  		"exp":     time.Now().Add(time.Hour).Unix(),
  	})
  	tokenString, _ := token.SignedString([]byte("mytestsecret"))

  	req, _ := http.NewRequest("GET", "/test-claims", nil)
  	req.Header.Set("Authorization", "Bearer "+tokenString)
  	w := httptest.NewRecorder()

  	r.ServeHTTP(w, req)

  	if w.Code != http.StatusOK {
  		t.Fatalf("Expected status 200, got %d", w.Code)
  	}

  	// Verify context values were set
  	if w.Body.String() != `{"role":"Admin RT","rt":"02","rw":"04","user_id":10}` {
  		t.Errorf("Unexpected body claims: %s", w.Body.String())
  	}
  }
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `go test ./projects/si-digi-rtrw/backend/middleware/... -v`
  Expected: Failure because `rt` and `rw` are not yet extracted and stored in the Gin context.

- [ ] **Step 3: Modify auth controller and middleware to include and parse RT/RW claims**
  Update `projects/si-digi-rtrw/backend/controllers/auth_controller.go` to load Resident details and include `rt` and `rw` in JWT claims:
  ```go
  // Target Content around Line 39 in projects/si-digi-rtrw/backend/controllers/auth_controller.go
  	// Load Resident to get RT/RW
  	var resident models.Resident
  	if user.ResidentID != 0 {
  		config.DB.First(&resident, user.ResidentID)
  	}

  	// Generate JWT
  	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
  		"user_id": user.ID,
  		"role":    user.Role,
  		"rt":      resident.RT,
  		"rw":      resident.RW,
  		"exp":     time.Now().Add(time.Hour * 24).Unix(),
  	})
  ```

  Update `projects/si-digi-rtrw/backend/middleware/jwt_middleware.go` around Line 49 to set claims in the context:
  ```go
  		c.Set("user_id", claims["user_id"])
  		c.Set("role", claims["role"])
  		c.Set("rt", claims["rt"])
  		c.Set("rw", claims["rw"])
  		c.Next()
  ```

- [ ] **Step 4: Run test to verify it passes**
  Run: `go test ./projects/si-digi-rtrw/backend/middleware/... -v`
  Expected: PASS

- [ ] **Step 5: Commit changes**
  Run:
  ```bash
  git add projects/si-digi-rtrw/backend/controllers/auth_controller.go projects/si-digi-rtrw/backend/middleware/jwt_middleware.go projects/si-digi-rtrw/backend/middleware/jwt_middleware_test.go
  git commit -m "feat: extend JWT authentication with RT/RW claims and middleware extraction"
  ```

---

### Task 2: Implement Data Isolation in Resident Management

**Files:**
- Modify: `projects/si-digi-rtrw/backend/controllers/resident_controller.go`
- Create: `projects/si-digi-rtrw/backend/controllers/resident_controller_test.go`

- [ ] **Step 1: Write failing resident isolation tests**
  Create `projects/si-digi-rtrw/backend/controllers/resident_controller_test.go`. Setup a GORM DB (using an SQLite in-memory db or MySQL test runner setup) to test that a user with "Admin RT" role and `rt="01"`, `rw="02"` cannot fetch residents belonging to `rt="02"`.
  ```go
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
  	// Use a test MySQL database or Mock DB
  	dsn := "root:root@tcp(127.0.0.1:3306)/si_digi_rtrw_test?charset=utf8mb4&parseTime=True&loc=Local"
  	var err error
  	config.DB, err = gorm.Open(mysql.Open(dsn), &gorm.Config{})
  	if err != nil {
  		panic("Failed to connect to test database. Ensure local MySQL has si_digi_rtrw_test database created.")
  	}
  	config.DB.AutoMigrate(&models.Resident{}, &models.Family{})
  	config.DB.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&models.Resident{})
  	config.DB.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&models.Family{})
  }

  func TestGetResidentsIsolation(t *testing.T) {
  	setupTestDB()
  	gin.SetMode(gin.TestMode)

  	// Seed residents from different RTs
  	res1 := models.Resident{FullName: "Resident RT 01", RT: "01", RW: "03", NIK: "111"}
  	res2 := models.Resident{FullName: "Resident RT 02", RT: "02", RW: "03", NIK: "222"}
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
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `go test ./projects/si-digi-rtrw/backend/controllers/... -run TestGetResidentsIsolation -v`
  Expected: Fail (retrieves both residents since no filtering is implemented).

- [ ] **Step 3: Modify resident controller to filter and isolate database operations**
  Modify `projects/si-digi-rtrw/backend/controllers/resident_controller.go` to enforce scope validation:
  ```go
  func GetResidents(c *gin.Context) {
  	rt, _ := c.Get("rt")
  	rw, _ := c.Get("rw")
  	role, _ := c.Get("role")

  	var residents []models.Resident
  	query := config.DB

  	if role == "Admin RT" {
  		query = query.Where("rt = ? AND rw = ?", rt, rw)
  	} else if role == "Admin RW" {
  		query = query.Where("rw = ?", rw)
  	} else {
  		c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
  		return
  	}

  	query.Find(&residents)
  	c.JSON(http.StatusOK, residents)
  }

  func CreateResident(c *gin.Context) {
  	rt, _ := c.Get("rt")
  	rw, _ := c.Get("rw")
  	role, _ := c.Get("role")

  	var resident models.Resident
  	if err := c.ShouldBindJSON(&resident); err != nil {
  		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
  		return
  	}

  	if role == "Admin RT" {
  		// Force Admin's RT and RW
  		resident.RT = rt.(string)
  		resident.RW = rw.(string)
  	} else if role == "Admin RW" {
  		resident.RW = rw.(string)
  	}

  	if err := config.DB.Create(&resident).Error; err != nil {
  		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create resident"})
  		return
  	}

  	c.JSON(http.StatusCreated, resident)
  }

  func GetFamilies(c *gin.Context) {
  	rt, _ := c.Get("rt")
  	rw, _ := c.Get("rw")
  	role, _ := c.Get("role")

  	var families []models.Family
  	query := config.DB

  	if role == "Admin RT" {
  		query = query.Where("rt = ? AND rw = ?", rt, rw)
  	} else if role == "Admin RW" {
  		query = query.Where("rw = ?", rw)
  	} else {
  		c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
  		return
  	}

  	query.Preload("Residents").Find(&families)
  	c.JSON(http.StatusOK, families)
  }

  func CreateFamily(c *gin.Context) {
  	rt, _ := c.Get("rt")
  	rw, _ := c.Get("rw")
  	role, _ := c.Get("role")

  	var family models.Family
  	if err := c.ShouldBindJSON(&family); err != nil {
  		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
  		return
  	}

  	if role == "Admin RT" {
  		family.RT = rt.(string)
  		family.RW = rw.(string)
  	} else if role == "Admin RW" {
  		family.RW = rw.(string)
  	}

  	if err := config.DB.Create(&family).Error; err != nil {
  		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create family"})
  		return
  	}

  	c.JSON(http.StatusCreated, family)
  }
  ```

- [ ] **Step 4: Run test to verify it passes**
  Run: `go test ./projects/si-digi-rtrw/backend/controllers/... -run TestGetResidentsIsolation -v`
  Expected: PASS

- [ ] **Step 5: Commit changes**
  Run:
  ```bash
  git add projects/si-digi-rtrw/backend/controllers/resident_controller.go projects/si-digi-rtrw/backend/controllers/resident_controller_test.go
  git commit -m "feat: isolate resident and family CRUD operations by RT/RW scope"
  ```

---

### Task 3: Secure Finance (Kas/Iuran) Transactions by RT/RW

**Files:**
- Modify: `projects/si-digi-rtrw/backend/controllers/finance_controller.go`
- Create: `projects/si-digi-rtrw/backend/controllers/finance_controller_test.go`

- [ ] **Step 1: Write failing finance isolation tests**
  Create `projects/si-digi-rtrw/backend/controllers/finance_controller_test.go` containing:
  ```go
  package controllers_test

  import (
  	"encoding/json"
  	"net/http"
  	"net/http/httptest"
  	"testing"

  	"si-digi-rtrw-backend/config"
  	"si-digi-rtrw-backend/controllers"
  	"si-digi-rtrw-backend/models"

  	"github.com/gin-gonic/gin"
  	"gorm.io/gorm"
  )

  func TestGetFinanceReportsIsolation(t *testing.T) {
  	setupTestDB()
  	gin.SetMode(gin.TestMode)

  	config.DB.AutoMigrate(&models.Finance{})
  	config.DB.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&models.Finance{})

  	// Seed transactions
  	tx1 := models.Finance{Amount: 100000, Type: "Pemasukan", Level: "RT", RT: "01", RW: "03"}
  	tx2 := models.Finance{Amount: 50000, Type: "Pemasukan", Level: "RT", RT: "02", RW: "03"}
  	config.DB.Create(&tx1)
  	config.DB.Create(&tx2)

  	r := gin.New()
  	r.GET("/finance/reports", func(c *gin.Context) {
  		c.Set("role", "Warga")
  		c.Set("rt", "01")
  		c.Set("rw", "03")
  		controllers.GetFinanceReports(c)
  	})

  	req, _ := http.NewRequest("GET", "/finance/reports?level=RT", nil)
  	w := httptest.NewRecorder()
  	r.ServeHTTP(w, req)

  	if w.Code != http.StatusOK {
  		t.Fatalf("Expected 200, got %d", w.Code)
  	}

  	var reports []models.Finance
  	json.Unmarshal(w.Body.Bytes(), &reports)

  	if len(reports) != 1 {
  		t.Fatalf("Expected 1 report matching RT 01, got %d", len(reports))
  	}
  	if reports[0].Amount != 100000 {
  		t.Errorf("Expected 100000, got %f", reports[0].Amount)
  	}
  }
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `go test ./projects/si-digi-rtrw/backend/controllers/... -run TestGetFinanceReportsIsolation -v`
  Expected: Fail (returns both transactions from RT 01 and RT 02).

- [ ] **Step 3: Modify finance controller queries**
  Update `projects/si-digi-rtrw/backend/controllers/finance_controller.go`:
  ```go
  func GetFinanceReports(c *gin.Context) {
  	level := c.Query("level") // RT or RW
  	rt, _ := c.Get("rt")
  	rw, _ := c.Get("rw")

  	var reports []models.Finance
  	query := config.DB.Where("rw = ?", rw)

  	if level == "RT" {
  		query = query.Where("level = ? AND rt = ?", "RT", rt)
  	} else {
  		query = query.Where("level = ?", "RW")
  	}

  	query.Find(&reports)
  	c.JSON(http.StatusOK, reports)
  }

  func AddTransaction(c *gin.Context) {
  	rt, _ := c.Get("rt")
  	rw, _ := c.Get("rw")
  	role, _ := c.Get("role")

  	var transaction models.Finance
  	if err := c.ShouldBindJSON(&transaction); err != nil {
  		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
  		return
  	}

  	// Ensure transaction is scoped to Admin's authority
  	transaction.RW = rw.(string)
  	if role == "Admin RT" {
  		transaction.Level = "RT"
  		transaction.RT = rt.(string)
  	} else if role == "Admin RW" {
  		transaction.Level = "RW"
  		transaction.RT = "" // RW transactions have no RT scope
  	}

  	if err := config.DB.Create(&transaction).Error; err != nil {
  		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record transaction"})
  		return
  	}

  	c.JSON(http.StatusCreated, transaction)
  }

  func GetBalanceSummary(c *gin.Context) {
  	level := c.Query("level")
  	rt, _ := c.Get("rt")
  	rw, _ := c.Get("rw")
  	var income, expense float64

  	queryBase := config.DB.Model(&models.Finance{}).Where("rw = ?", rw)
  	if level == "RT" {
  		queryBase = queryBase.Where("level = ? AND rt = ?", "RT", rt)
  	} else {
  		queryBase = queryBase.Where("level = ?", "RW")
  	}

  	queryBase.Session(&gorm.Session{}).Where("type = ?", "Pemasukan").Select("SUM(amount)").Scan(&income)
  	queryBase.Session(&gorm.Session{}).Where("type = ?", "Pengeluaran").Select("SUM(amount)").Scan(&expense)

  	c.JSON(http.StatusOK, gin.H{
  		"total_income":  income,
  		"total_expense": expense,
  		"balance":       income - expense,
  	})
  }
  ```

- [ ] **Step 4: Run test to verify it passes**
  Run: `go test ./projects/si-digi-rtrw/backend/controllers/... -run TestGetFinanceReportsIsolation -v`
  Expected: PASS

- [ ] **Step 5: Commit changes**
  Run:
  ```bash
  git add projects/si-digi-rtrw/backend/controllers/finance_controller.go projects/si-digi-rtrw/backend/controllers/finance_controller_test.go
  git commit -m "feat: enforce RT/RW data isolation on financial transaction records and summaries"
  ```

---

### Task 4: Secure E-Surat Requests & Review Stages

**Files:**
- Modify: `projects/si-digi-rtrw/backend/controllers/letter_controller.go`
- Create: `projects/si-digi-rtrw/backend/controllers/letter_controller_test.go`

- [ ] **Step 1: Write failing letter request scoping tests**
  Create `projects/si-digi-rtrw/backend/controllers/letter_controller_test.go` containing:
  ```go
  package controllers_test

  import (
  	"encoding/json"
  	"net/http"
  	"net/http/httptest"
  	"testing"

  	"si-digi-rtrw-backend/config"
  	"si-digi-rtrw-backend/controllers"
  	"si-digi-rtrw-backend/models"

  	"github.com/gin-gonic/gin"
  	"gorm.io/gorm"
  )

  func TestGetLetterRequestsIsolation(t *testing.T) {
  	setupTestDB()
  	gin.SetMode(gin.TestMode)

  	config.DB.AutoMigrate(&models.Letter{})
  	config.DB.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&models.Letter{})

  	// Seed letters
  	letter1 := models.Letter{Type: "Domisili", RT: "01", RW: "03", Status: models.PendingRT}
  	letter2 := models.Letter{Type: "Domisili", RT: "02", RW: "03", Status: models.PendingRT}
  	config.DB.Create(&letter1)
  	config.DB.Create(&letter2)

  	r := gin.New()
  	r.GET("/letters", func(c *gin.Context) {
  		c.Set("role", "Admin RT")
  		c.Set("rt", "01")
  		c.Set("rw", "03")
  		controllers.GetLetterRequests(c)
  	})

  	req, _ := http.NewRequest("GET", "/letters", nil)
  	w := httptest.NewRecorder()
  	r.ServeHTTP(w, req)

  	if w.Code != http.StatusOK {
  		t.Fatalf("Expected 200, got %d", w.Code)
  	}

  	var list []models.Letter
  	json.Unmarshal(w.Body.Bytes(), &list)

  	if len(list) != 1 {
  		t.Fatalf("Expected 1 letter (RT 01 only), got %d", len(list))
  	}
  }
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `go test ./projects/si-digi-rtrw/backend/controllers/... -run TestGetLetterRequestsIsolation -v`
  Expected: Fail (fetches both letters).

- [ ] **Step 3: Modify letter controller queries**
  Update `projects/si-digi-rtrw/backend/controllers/letter_controller.go`:
  ```go
  func CreateLetterRequest(c *gin.Context) {
  	rt, _ := c.Get("rt")
  	rw, _ := c.Get("rw")
  	userID, _ := c.Get("user_id")

  	var letter models.Letter
  	if err := c.ShouldBindJSON(&letter); err != nil {
  		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
  		return
  	}

  	// Force applicant details and RT/RW matching their user session
  	letter.ApplicantID = uint(userID.(float64))
  	letter.RT = rt.(string)
  	letter.RW = rw.(string)
  	letter.Status = models.PendingRT

  	if err := config.DB.Create(&letter).Error; err != nil {
  		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create letter request"})
  		return
  	}

  	c.JSON(http.StatusCreated, letter)
  }

  func GetLetterRequests(c *gin.Context) {
  	var letters []models.Letter
  	role, _ := c.Get("role")
  	rt, _ := c.Get("rt")
  	rw, _ := c.Get("rw")
  	userID, _ := c.Get("user_id")

  	query := config.DB

  	if role == "Admin RT" {
  		query = query.Where("status = ? AND rt = ? AND rw = ?", models.PendingRT, rt, rw)
  	} else if role == "Admin RW" {
  		query = query.Where("status = ? AND rw = ?", models.PendingRW, rw)
  	} else {
  		// Warga can only view their own applications
  		query = query.Where("applicant_id = ?", userID)
  	}

  	query.Find(&letters)
  	c.JSON(http.StatusOK, letters)
  }

  func ApproveLetter(c *gin.Context) {
  	id := c.Param("id")
  	role, _ := c.Get("role")
  	rt, _ := c.Get("rt")
  	rw, _ := c.Get("rw")
  	var letter models.Letter

  	if err := config.DB.First(&letter, id).Error; err != nil {
  		c.JSON(http.StatusNotFound, gin.H{"error": "Letter request not found"})
  		return
  	}

  	// Validate approval authority (matching Admin's RT/RW jurisdiction)
  	if role == "Admin RT" && letter.Status == models.PendingRT && letter.RT == rt && letter.RW == rw {
  		letter.Status = models.PendingRW
  	} else if role == "Admin RW" && letter.Status == models.PendingRW && letter.RW == rw {
  		letter.Status = models.Approved
  		letter.PDFUrl = "/storage/letters/generated-letter-" + id + ".pdf"
  	} else {
  		c.JSON(http.StatusForbidden, gin.H{"error": "Invalid approval stage or permission"})
  		return
  	}

  	config.DB.Save(&letter)
  	c.JSON(http.StatusOK, letter)
  }

  func RejectLetter(c *gin.Context) {
  	id := c.Param("id")
  	role, _ := c.Get("role")
  	rt, _ := c.Get("rt")
  	rw, _ := c.Get("rw")
  	var letter models.Letter

  	if err := config.DB.First(&letter, id).Error; err != nil {
  		c.JSON(http.StatusNotFound, gin.H{"error": "Letter request not found"})
  		return
  	}

  	// Validate rejection authority (matching Admin's RT/RW jurisdiction)
  	if role == "Admin RT" && letter.Status == models.PendingRT && letter.RT == rt && letter.RW == rw {
  		letter.Status = models.Rejected
  	} else if role == "Admin RW" && letter.Status == models.PendingRW && letter.RW == rw {
  		letter.Status = models.Rejected
  	} else {
  		c.JSON(http.StatusForbidden, gin.H{"error": "Invalid rejection stage or permission"})
  		return
  	}

  	config.DB.Save(&letter)
  	c.JSON(http.StatusOK, gin.H{"message": "Letter request rejected"})
  }
  ```

- [ ] **Step 4: Run test to verify it passes**
  Run: `go test ./projects/si-digi-rtrw/backend/controllers/... -run TestGetLetterRequestsIsolation -v`
  Expected: PASS

- [ ] **Step 5: Commit changes**
  Run:
  ```bash
  git add projects/si-digi-rtrw/backend/controllers/letter_controller.go projects/si-digi-rtrw/backend/controllers/letter_controller_test.go
  git commit -m "feat: secure E-surat workflow and approval stages with RT/RW scoping"
  ```

---

### Task 5: Isolate Announcement Scopes

**Files:**
- Modify: `projects/si-digi-rtrw/backend/controllers/announcement_controller.go`
- Create: `projects/si-digi-rtrw/backend/controllers/announcement_controller_test.go`

- [ ] **Step 1: Write failing announcements isolation tests**
  Create `projects/si-digi-rtrw/backend/controllers/announcement_controller_test.go` containing:
  ```go
  package controllers_test

  import (
  	"encoding/json"
  	"net/http"
  	"net/http/httptest"
  	"testing"

  	"si-digi-rtrw-backend/config"
  	"si-digi-rtrw-backend/controllers"
  	"si-digi-rtrw-backend/models"

  	"github.com/gin-gonic/gin"
  )

  func TestGetAnnouncementsIsolation(t *testing.T) {
  	setupTestDB()
  	gin.SetMode(gin.TestMode)

  	config.DB.AutoMigrate(&models.Announcement{}, &models.User{})
  	config.DB.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&models.Announcement{})

  	// Seed announcements
  	ann1 := models.Announcement{Title: "Public Info", Level: "Publik"}
  	ann2 := models.Announcement{Title: "RW 03 Info", Level: "RW", RW: "03"}
  	ann3 := models.Announcement{Title: "RT 01 Info", Level: "RT", RT: "01", RW: "03"}
  	ann4 := models.Announcement{Title: "RT 02 Info", Level: "RT", RT: "02", RW: "03"}
  	config.DB.Create(&ann1)
  	config.DB.Create(&ann2)
  	config.DB.Create(&ann3)
  	config.DB.Create(&ann4)

  	r := gin.New()
  	r.GET("/announcements", func(c *gin.Context) {
  		c.Set("role", "Warga")
  		c.Set("rt", "01")
  		c.Set("rw", "03")
  		controllers.GetAnnouncements(c)
  	})

  	req, _ := http.NewRequest("GET", "/announcements", nil)
  	w := httptest.NewRecorder()
  	r.ServeHTTP(w, req)

  	if w.Code != http.StatusOK {
  		t.Fatalf("Expected 200, got %d", w.Code)
  	}

  	var list []models.Announcement
  	json.Unmarshal(w.Body.Bytes(), &list)

  	if len(list) != 3 {
  		t.Fatalf("Expected 3 announcements (Public, RW 03, RT 01), got %d", len(list))
  	}
  }
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `go test ./projects/si-digi-rtrw/backend/controllers/... -run TestGetAnnouncementsIsolation -v`
  Expected: Fail (returns all 4 announcements).

- [ ] **Step 3: Modify announcement controller scope checking**
  Update `projects/si-digi-rtrw/backend/controllers/announcement_controller.go`:
  ```go
  func GetAnnouncements(c *gin.Context) {
  	rt, _ := c.Get("rt")
  	rw, _ := c.Get("rw")
  	
  	var announcements []models.Announcement
  	// Filter only target audience matching user scope
  	config.DB.Preload("Author").Where(
  		"level = ? OR (level = ? AND rw = ?) OR (level = ? AND rt = ? AND rw = ?)",
  		"Publik", "RW", rw, "RT", rt, rw,
  	).Find(&announcements)
  	
  	c.JSON(http.StatusOK, announcements)
  }

  func CreateAnnouncement(c *gin.Context) {
  	rt, _ := c.Get("rt")
  	rw, _ := c.Get("rw")
  	role, _ := c.Get("role")
  	userID, _ := c.Get("user_id")

  	var announcement models.Announcement
  	if err := c.ShouldBindJSON(&announcement); err != nil {
  		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
  		return
  	}

  	announcement.AuthorID = uint(userID.(float64))
  	announcement.RW = rw.(string)

  	// Force RT context based on creator's role
  	if role == "Admin RT" {
  		announcement.Level = "RT"
  		announcement.RT = rt.(string)
  	} else if role == "Admin RW" && announcement.Level == "" {
  		announcement.Level = "RW"
  		announcement.RT = ""
  	}

  	if err := config.DB.Create(&announcement).Error; err != nil {
  		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create announcement"})
  		return
  	}

  	c.JSON(http.StatusCreated, announcement)
  }
  ```

- [ ] **Step 4: Run test to verify it passes**
  Run: `go test ./projects/si-digi-rtrw/backend/controllers/... -run TestGetAnnouncementsIsolation -v`
  Expected: PASS

- [ ] **Step 5: Commit changes**
  Run:
  ```bash
  git add projects/si-digi-rtrw/backend/controllers/announcement_controller.go projects/si-digi-rtrw/backend/controllers/announcement_controller_test.go
  git commit -m "feat: restrict announcements access and creation by RT/RW target scopes"
  ```
