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
)

func setupFinanceTestDB() {
	setupTestDB()
}

func TestGetFinanceReportsIsolation(t *testing.T) {
	setupFinanceTestDB()
	gin.SetMode(gin.TestMode)

	// Seed transactions
	tx1 := models.Finance{Amount: 100000, Type: "Pemasukan", Level: "RT", RT: "01", RW: "03", Date: time.Now()}
	tx2 := models.Finance{Amount: 50000, Type: "Pemasukan", Level: "RT", RT: "02", RW: "03", Date: time.Now()}
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

func TestGetBalanceSummaryIsolation(t *testing.T) {
	setupFinanceTestDB()
	gin.SetMode(gin.TestMode)

	// Seed transactions
	tx1 := models.Finance{Amount: 100000, Type: "Pemasukan", Level: "RT", RT: "01", RW: "03", Date: time.Now()}
	tx2 := models.Finance{Amount: 50000, Type: "Pemasukan", Level: "RT", RT: "02", RW: "03", Date: time.Now()}
	tx3 := models.Finance{Amount: 30000, Type: "Pengeluaran", Level: "RT", RT: "01", RW: "03", Date: time.Now()}
	config.DB.Create(&tx1)
	config.DB.Create(&tx2)
	config.DB.Create(&tx3)

	r := gin.New()
	r.GET("/finance/summary", func(c *gin.Context) {
		c.Set("role", "Warga")
		c.Set("rt", "01")
		c.Set("rw", "03")
		controllers.GetBalanceSummary(c)
	})

	req, _ := http.NewRequest("GET", "/finance/summary?level=RT", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected 200, got %d", w.Code)
	}

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)

	// We only expect tx1 (100000 Pemasukan) and tx3 (30000 Pengeluaran) for RT 01.
	// Balance: 100000 - 30000 = 70000.
	// (tx2 is from RT 02 and should be ignored).
	if resp["total_income"].(float64) != 100000 {
		t.Errorf("Expected total_income to be 100000, got %f", resp["total_income"])
	}
	if resp["total_expense"].(float64) != 30000 {
		t.Errorf("Expected total_expense to be 30000, got %f", resp["total_expense"])
	}
	if resp["balance"].(float64) != 70000 {
		t.Errorf("Expected balance to be 70000, got %f", resp["balance"])
	}
}

func TestAddTransactionIsolation(t *testing.T) {
	setupFinanceTestDB()
	gin.SetMode(gin.TestMode)

	r := gin.New()
	r.POST("/finance/transaction", func(c *gin.Context) {
		// Mock Admin RT of RT 01
		c.Set("role", "Admin RT")
		c.Set("rt", "01")
		c.Set("rw", "03")
		controllers.AddTransaction(c)
	})

	// Try setting mismatching RT and RW, and a level of RW which is unauthorized for Admin RT.
	payload := map[string]interface{}{
		"amount": 250000,
		"type":   "Pengeluaran",
		"level":  "RW",
		"rt":     "02",
		"rw":     "04",
		"date":   time.Now().Format(time.RFC3339),
	}
	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", "/finance/transaction", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("Expected 201 Created, got %d. Response: %s", w.Code, w.Body.String())
	}

	var created models.Finance
	json.Unmarshal(w.Body.Bytes(), &created)

	// The controller must override RT, RW, and Level to Admin RT's scoped jurisdiction
	if created.RT != "01" || created.RW != "03" || created.Level != "RT" {
		t.Errorf("Expected created transaction RT=01, RW=03, Level=RT. Got RT=%s, RW=%s, Level=%s", created.RT, created.RW, created.Level)
	}
}

func TestAddTransactionDateDefaulting(t *testing.T) {
	setupFinanceTestDB()
	gin.SetMode(gin.TestMode)

	r := gin.New()
	r.POST("/finance/transaction", func(c *gin.Context) {
		c.Set("role", "Admin RT")
		c.Set("rt", "01")
		c.Set("rw", "03")
		controllers.AddTransaction(c)
	})

	// Payload with missing date
	payload := map[string]interface{}{
		"amount": 10000,
		"type":   "Pemasukan",
	}
	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", "/finance/transaction", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("Expected 201 Created, got %d", w.Code)
	}

	var created models.Finance
	json.Unmarshal(w.Body.Bytes(), &created)

	if created.Date.IsZero() || created.Date.Year() < 2000 {
		t.Errorf("Expected date to be defaulted to current time, got %v", created.Date)
	}
}

func TestAddTransactionAdminRWValidation(t *testing.T) {
	setupFinanceTestDB()
	gin.SetMode(gin.TestMode)

	r := gin.New()
	r.POST("/finance/transaction", func(c *gin.Context) {
		c.Set("role", "Admin RW")
		c.Set("rw", "03")
		controllers.AddTransaction(c)
	})

	// Level RT but missing RT field
	payload := map[string]interface{}{
		"amount": 20000,
		"type":   "Pemasukan",
		"level":  "RT",
		"rt":     "",
	}
	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", "/finance/transaction", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected 400 Bad Request when Admin RW registers RT-level transaction without specifying RT, got %d", w.Code)
	}
}

func TestGetBalanceSummaryEmptyDB(t *testing.T) {
	setupFinanceTestDB() // Wipes the table, so it's empty
	gin.SetMode(gin.TestMode)

	r := gin.New()
	r.GET("/finance/summary", func(c *gin.Context) {
		c.Set("role", "Warga")
		c.Set("rt", "01")
		c.Set("rw", "03")
		controllers.GetBalanceSummary(c)
	})

	req, _ := http.NewRequest("GET", "/finance/summary?level=RT", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected 200, got %d", w.Code)
	}

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)

	if resp["total_income"].(float64) != 0 || resp["total_expense"].(float64) != 0 || resp["balance"].(float64) != 0 {
		t.Errorf("Expected zeros, got income=%v, expense=%v, balance=%v", resp["total_income"], resp["total_expense"], resp["balance"])
	}
}
