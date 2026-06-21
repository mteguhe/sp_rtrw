package controllers

import (
	"net/http"
	"si-digi-rtrw-backend/config"
	"si-digi-rtrw-backend/models"

	"github.com/gin-gonic/gin"
)

func GetAnnouncements(c *gin.Context) {
	rt, _ := c.Get("rt")
	rw, _ := c.Get("rw")
	role, _ := c.Get("role")

	rtStr, _ := rt.(string)
	rwStr, _ := rw.(string)
	roleStr, _ := role.(string)

	var announcements []models.Announcement
	query := config.DB.Preload("Author")

	if roleStr == "Admin RT" || roleStr == "Warga" {
		query = query.Where(
			"level = ? OR (level = ? AND rw = ?) OR (level = ? AND rt = ? AND rw = ?)",
			"Publik", "RW", rwStr, "RT", rtStr, rwStr,
		)
	} else if roleStr == "Admin RW" {
		query = query.Where(
			"level = ? OR (level = ? AND rw = ?) OR (level = ? AND rw = ?)",
			"Publik", "RW", rwStr, "RT", rwStr,
		)
	} else {
		c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
		return
	}

	if err := query.Find(&announcements).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch announcements"})
		return
	}

	c.JSON(http.StatusOK, announcements)
}

func CreateAnnouncement(c *gin.Context) {
	rt, _ := c.Get("rt")
	rw, _ := c.Get("rw")
	role, _ := c.Get("role")
	userID, _ := c.Get("user_id")

	rtStr, _ := rt.(string)
	rwStr, _ := rw.(string)
	roleStr, _ := role.(string)

	if roleStr != "Admin RT" && roleStr != "Admin RW" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
		return
	}

	var announcement models.Announcement
	if err := c.ShouldBindJSON(&announcement); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	announcement.AuthorID = uint(userID.(float64))
	announcement.RW = rwStr

	if roleStr == "Admin RT" {
		announcement.Level = "RT"
		announcement.RT = rtStr
	} else if roleStr == "Admin RW" {
		if announcement.Level == "" {
			announcement.Level = "RW"
		}
		if announcement.Level == "RW" {
			announcement.RT = ""
		}
	}

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
