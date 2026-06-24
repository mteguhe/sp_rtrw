package controllers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"si-digi-rtrw-backend/config"
	"si-digi-rtrw-backend/models"
	"time"

	"github.com/gin-gonic/gin"
)

func CreateComplaint(c *gin.Context) {
	rt, _ := c.Get("rt")
	rw, _ := c.Get("rw")
	userID, exists := c.Get("user_id")

	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var uID uint
	switch v := userID.(type) {
	case float64:
		uID = uint(v)
	case uint:
		uID = v
	case int:
		uID = uint(v)
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID type"})
		return
	}

	title := c.PostForm("title")
	description := c.PostForm("description")

	if title == "" || description == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Title and description are required"})
		return
	}

	// Handle Photo Upload
	file, err := c.FormFile("photo")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Photo file is required"})
		return
	}

	// Ensure uploads directory exists
	uploadDir := "./uploads/complaints"
	if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create upload directory"})
		return
	}

	filename := fmt.Sprintf("complaint-%d-%s", time.Now().UnixNano(), filepath.Base(file.Filename))
	filePath := filepath.Join(uploadDir, filename)

	if err := c.SaveUploadedFile(file, filePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save uploaded file"})
		return
	}

	photoURL := "/uploads/complaints/" + filename

	rtStr, _ := rt.(string)
	rwStr, _ := rw.(string)

	complaint := models.Complaint{
		Title:       title,
		Description: description,
		PhotoURL:    photoURL,
		Status:      models.StatusDiterima,
		ReporterID:  uID,
		RT:          rtStr,
		RW:          rwStr,
	}

	if err := config.DB.Omit("Reporter").Create(&complaint).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save complaint to database"})
		return
	}

	c.JSON(http.StatusCreated, complaint)
}

func GetComplaints(c *gin.Context) {
	rt, _ := c.Get("rt")
	rw, _ := c.Get("rw")
	role, _ := c.Get("role")

	rtStr, _ := rt.(string)
	rwStr, _ := rw.(string)
	roleStr, _ := role.(string)

	var list []models.Complaint
	query := config.DB.Preload("Reporter").Preload("Reporter.Resident")

	if roleStr == "Admin RT" {
		query = query.Where("rt = ? AND rw = ?", rtStr, rwStr)
	} else {
		// Admin RW and Warga can see all complaints in their RW (since system serves 1 RW)
		query = query.Where("rw = ?", rwStr)
	}

	if err := query.Find(&list).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch complaints"})
		return
	}

	c.JSON(http.StatusOK, list)
}

func UpdateComplaintStatus(c *gin.Context) {
	id := c.Param("id")
	role, _ := c.Get("role")
	rt, _ := c.Get("rt")
	rw, _ := c.Get("rw")

	roleStr, _ := role.(string)
	rtStr, _ := rt.(string)
	rwStr, _ := rw.(string)

	if roleStr != "Admin RT" && roleStr != "Admin RW" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
		return
	}

	var payload struct {
		Status models.ComplaintStatus `json:"status" binding:"required"`
	}

	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if payload.Status != models.StatusDiterima && payload.Status != models.StatusDiproses && payload.Status != models.StatusSelesai {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid status value"})
		return
	}

	var complaint models.Complaint
	dbQuery := config.DB

	if roleStr == "Admin RT" {
		dbQuery = dbQuery.Where("rt = ? AND rw = ?", rtStr, rwStr)
	} else if roleStr == "Admin RW" {
		dbQuery = dbQuery.Where("rw = ?", rwStr)
	}

	if err := dbQuery.First(&complaint, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Complaint not found or out of scope"})
		return
	}

	complaint.Status = payload.Status
	if err := config.DB.Omit("Reporter").Save(&complaint).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update complaint status"})
		return
	}

	c.JSON(http.StatusOK, complaint)
}
