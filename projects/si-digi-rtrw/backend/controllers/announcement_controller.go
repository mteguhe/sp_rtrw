package controllers

import (
	"net/http"
	"si-digi-rtrw-backend/config"
	"si-digi-rtrw-backend/models"

	"github.com/gin-gonic/gin"
)

func GetAnnouncements(c *gin.Context) {
	var announcements []models.Announcement
	config.DB.Preload("Author").Find(&announcements)
	c.JSON(http.StatusOK, announcements)
}

func CreateAnnouncement(c *gin.Context) {
	var announcement models.Announcement
	if err := c.ShouldBindJSON(&announcement); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Set author from context (from JWT middleware)
	userID, _ := c.Get("user_id")
	announcement.AuthorID = uint(userID.(float64))

	if err := config.DB.Create(&announcement).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create announcement"})
		return
	}

	c.JSON(http.StatusCreated, announcement)
}

func GetPublicAnnouncements(c *gin.Context) {
	var announcements []models.Announcement
	config.DB.Where("level = ?", "Publik").Find(&announcements)
	c.JSON(http.StatusOK, announcements)
}
