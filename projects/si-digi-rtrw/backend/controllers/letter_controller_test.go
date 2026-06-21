package controllers_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"si-digi-rtrw-backend/config"
	"si-digi-rtrw-backend/controllers"
	"si-digi-rtrw-backend/models"

	"github.com/gin-gonic/gin"
)

func setupLetterTestDB() {
	setupTestDB()
}

func TestGetLetterRequestsIsolation(t *testing.T) {
	setupLetterTestDB()
	gin.SetMode(gin.TestMode)

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

func TestCreateLetterRequestIsolation(t *testing.T) {
	setupLetterTestDB()
	gin.SetMode(gin.TestMode)

	r := gin.New()
	r.POST("/letters", func(c *gin.Context) {
		c.Set("role", "Warga")
		c.Set("user_id", float64(12))
		c.Set("rt", "01")
		c.Set("rw", "03")
		controllers.CreateLetterRequest(c)
	})

	payload := map[string]interface{}{
		"type": "Domisili",
		"rt":   "09", // attempt to override to a different RT
		"rw":   "09", // attempt to override to a different RW
	}
	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", "/letters", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("Expected 201 Created, got %d", w.Code)
	}

	var created models.Letter
	json.Unmarshal(w.Body.Bytes(), &created)

	// Ensure the letter was automatically scoped to the user's claims
	if created.RT != "01" || created.RW != "03" {
		t.Errorf("Expected RT 01 and RW 03, got RT %s and RW %s", created.RT, created.RW)
	}
}

func TestApproveLetterIsolation(t *testing.T) {
	setupLetterTestDB()
	gin.SetMode(gin.TestMode)

	// Seed letters
	letterSameScope := models.Letter{Type: "Domisili", RT: "01", RW: "03", Status: models.PendingRT}
	letterDiffScope := models.Letter{Type: "Domisili", RT: "02", RW: "03", Status: models.PendingRT}
	config.DB.Create(&letterSameScope)
	config.DB.Create(&letterDiffScope)

	r := gin.New()
	r.POST("/letters/:id/approve", func(c *gin.Context) {
		c.Set("role", "Admin RT")
		c.Set("rt", "01")
		c.Set("rw", "03")
		controllers.ApproveLetter(c)
	})

	// 1. Approve letter within the same RT scope
	req1, _ := http.NewRequest("POST", fmt.Sprintf("/letters/%d/approve", letterSameScope.ID), nil)
	w1 := httptest.NewRecorder()
	r.ServeHTTP(w1, req1)

	if w1.Code != http.StatusOK {
		t.Errorf("Expected 200 for same scope approval, got %d", w1.Code)
	}

	// 2. Try approving letter in a different RT scope (should return 404 since it's not found in scope query)
	req2, _ := http.NewRequest("POST", fmt.Sprintf("/letters/%d/approve", letterDiffScope.ID), nil)
	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, req2)

	if w2.Code != http.StatusNotFound {
		t.Errorf("Expected 404 for different scope approval, got %d", w2.Code)
	}
}

func TestRejectLetterIsolation(t *testing.T) {
	setupLetterTestDB()
	gin.SetMode(gin.TestMode)

	// Seed letters
	letterSameScope := models.Letter{Type: "Domisili", RT: "01", RW: "03", Status: models.PendingRT}
	letterDiffScope := models.Letter{Type: "Domisili", RT: "02", RW: "03", Status: models.PendingRT}
	config.DB.Create(&letterSameScope)
	config.DB.Create(&letterDiffScope)

	r := gin.New()
	r.POST("/letters/:id/reject", func(c *gin.Context) {
		c.Set("role", "Admin RT")
		c.Set("rt", "01")
		c.Set("rw", "03")
		controllers.RejectLetter(c)
	})

	// 1. Reject letter within the same RT scope
	req1, _ := http.NewRequest("POST", fmt.Sprintf("/letters/%d/reject", letterSameScope.ID), nil)
	w1 := httptest.NewRecorder()
	r.ServeHTTP(w1, req1)

	if w1.Code != http.StatusOK {
		t.Errorf("Expected 200 for same scope reject, got %d", w1.Code)
	}

	// 2. Try rejecting letter in a different RT scope (should return 404 since it's not found in scope query)
	req2, _ := http.NewRequest("POST", fmt.Sprintf("/letters/%d/reject", letterDiffScope.ID), nil)
	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, req2)

	if w2.Code != http.StatusNotFound {
		t.Errorf("Expected 404 for different scope reject, got %d", w2.Code)
	}
}
