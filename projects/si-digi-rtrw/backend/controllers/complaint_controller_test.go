package controllers_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"si-digi-rtrw-backend/config"
	"si-digi-rtrw-backend/controllers"
	"si-digi-rtrw-backend/models"

	"github.com/gin-gonic/gin"
)

func TestComplaintWorkflow(t *testing.T) {
	setupTestDB()
	gin.SetMode(gin.TestMode)

	// Seed User & Resident
	fam := models.Family{NoKK: "55554444", Address: "Blok A", RT: "01", RW: "03"}
	config.DB.Create(&fam)
	res := models.Resident{FullName: "Lapor Warga", RT: "01", RW: "03", NIK: "55551111", DateOfBirth: time.Now(), FamilyID: fam.ID}
	config.DB.Create(&res)
	user := models.User{Username: "lapor_warga", Password: "pwd", Role: "Warga", ResidentID: res.ID}
	config.DB.Create(&user)

	r := gin.New()
	r.POST("/api/complaints", func(c *gin.Context) {
		c.Set("role", "Warga")
		c.Set("user_id", float64(user.ID))
		c.Set("rt", "01")
		c.Set("rw", "03")
		controllers.CreateComplaint(c)
	})
	r.GET("/api/complaints", func(c *gin.Context) {
		c.Set("role", "Admin RT")
		c.Set("rt", "01")
		c.Set("rw", "03")
		controllers.GetComplaints(c)
	})
	r.PUT("/api/complaints/:id/status", func(c *gin.Context) {
		c.Set("role", "Admin RT")
		c.Set("rt", "01")
		c.Set("rw", "03")
		controllers.UpdateComplaintStatus(c)
	})

	// Create multipart mock request body for photo upload
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	_ = writer.WriteField("title", "Jalan Berlubang")
	_ = writer.WriteField("description", "Lubang besar di RT 01 membahayakan pengendara")
	part, _ := writer.CreateFormFile("photo", "test_photo.png")
	_, _ = part.Write([]byte("fake image data"))
	_ = writer.Close()

	// 1. Submit complaint
	req, _ := http.NewRequest("POST", "/api/complaints", body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("Expected 201 Created, got %d. Body: %s", w.Code, w.Body.String())
	}

	var created models.Complaint
	json.Unmarshal(w.Body.Bytes(), &created)
	if created.Title != "Jalan Berlubang" || created.PhotoURL == "" {
		t.Errorf("Expected populated complaint fields, got %+v", created)
	}

	// 2. Fetch list of complaints as Admin RT
	req2, _ := http.NewRequest("GET", "/api/complaints", nil)
	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, req2)

	if w2.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK, got %d", w2.Code)
	}

	var list []models.Complaint
	json.Unmarshal(w2.Body.Bytes(), &list)
	if len(list) != 1 {
		t.Fatalf("Expected 1 complaint in list, got %d", len(list))
	}

	// 3. Update complaint status
	statusPayload := map[string]interface{}{
		"status": "Diproses",
	}
	statusBody, _ := json.Marshal(statusPayload)
	req3, _ := http.NewRequest("PUT", fmt.Sprintf("/api/complaints/%d/status", created.ID), bytes.NewBuffer(statusBody))
	req3.Header.Set("Content-Type", "application/json")
	w3 := httptest.NewRecorder()
	r.ServeHTTP(w3, req3)

	if w3.Code != http.StatusOK {
		t.Fatalf("Expected 200 OK, got %d. Body: %s", w3.Code, w3.Body.String())
	}

	var updated models.Complaint
	json.Unmarshal(w3.Body.Bytes(), &updated)
	if updated.Status != models.StatusDiproses {
		t.Errorf("Expected status to be Diproses, got %s", updated.Status)
	}
}
