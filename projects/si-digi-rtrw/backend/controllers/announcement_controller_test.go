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

func TestGetAnnouncementsIsolation(t *testing.T) {
	setupTestDB()
	gin.SetMode(gin.TestMode)

	// Create Family and Resident first to satisfy User foreign key constraint
	fam := models.Family{NoKK: "5555666677778888", Address: "Jl. Announcement", RT: "01", RW: "03"}
	config.DB.Create(&fam)

	res := models.Resident{FullName: "Resident User", RT: "01", RW: "03", NIK: "99991111", DateOfBirth: time.Now(), FamilyID: fam.ID}
	config.DB.Create(&res)

	// Create User
	author := models.User{Username: "author_user", Password: "pwd", Role: "Admin RT", ResidentID: res.ID}
	config.DB.Create(&author)

	// Seed announcements
	ann1 := models.Announcement{Title: "Public Info", Content: "Public content", Level: "Publik", AuthorID: author.ID}
	ann2 := models.Announcement{Title: "RW 03 Info", Content: "RW content", Level: "RW", RW: "03", AuthorID: author.ID}
	ann3 := models.Announcement{Title: "RT 01 Info", Content: "RT 01 content", Level: "RT", RT: "01", RW: "03", AuthorID: author.ID}
	ann4 := models.Announcement{Title: "RT 02 Info", Content: "RT 02 content", Level: "RT", RT: "02", RW: "03", AuthorID: author.ID}
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

	// Verify we got the correct ones
	titles := make(map[string]bool)
	for _, a := range list {
		titles[a.Title] = true
	}

	if !titles["Public Info"] || !titles["RW 03 Info"] || !titles["RT 01 Info"] {
		t.Errorf("Unexpected announcements titles in list: %+v", titles)
	}

	if titles["RT 02 Info"] {
		t.Error("Did not expect to find RT 02 Info in list")
	}
}

func TestCreateAnnouncementIsolation(t *testing.T) {
	setupTestDB()
	gin.SetMode(gin.TestMode)

	// Create Family and Resident first to satisfy User foreign key constraint
	fam := models.Family{NoKK: "5555666677778888", Address: "Jl. Announcement", RT: "01", RW: "03"}
	config.DB.Create(&fam)

	res := models.Resident{FullName: "Resident User", RT: "01", RW: "03", NIK: "99991111", DateOfBirth: time.Now(), FamilyID: fam.ID}
	config.DB.Create(&res)

	// Create User
	author := models.User{Username: "author_user", Password: "pwd", Role: "Admin RT", ResidentID: res.ID}
	config.DB.Create(&author)

	r := gin.New()
	r.POST("/announcements", func(c *gin.Context) {
		c.Set("role", "Admin RT")
		c.Set("user_id", float64(author.ID))
		c.Set("rt", "01")
		c.Set("rw", "03")
		controllers.CreateAnnouncement(c)
	})

	payload := map[string]interface{}{
		"title":   "RT Announcement",
		"content": "Meeting tonight",
		"level":   "Publik", // Attempt to override
		"rt":      "99",     // Attempt to override
		"rw":      "99",     // Attempt to override
	}
	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest("POST", "/announcements", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("Expected 201 Created, got %d", w.Code)
	}

	var created models.Announcement
	json.Unmarshal(w.Body.Bytes(), &created)

	if created.Level != "RT" || created.RT != "01" || created.RW != "03" {
		t.Errorf("Expected Level: RT, RT: 01, RW: 03. Got Level: %s, RT: %s, RW: %s", created.Level, created.RT, created.RW)
	}
}
