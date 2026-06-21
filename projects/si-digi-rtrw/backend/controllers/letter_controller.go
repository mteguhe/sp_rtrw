package controllers

import (
	"net/http"
	"si-digi-rtrw-backend/config"
	"si-digi-rtrw-backend/models"

	"github.com/gin-gonic/gin"
)

func CreateLetterRequest(c *gin.Context) {
	rt, _ := c.Get("rt")
	rw, _ := c.Get("rw")
	role, _ := c.Get("role")

	rtStr, _ := rt.(string)
	rwStr, _ := rw.(string)
	roleStr, _ := role.(string)

	if roleStr != "Admin RT" && roleStr != "Admin RW" && roleStr != "Warga" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
		return
	}

	var letter models.Letter
	if err := c.ShouldBindJSON(&letter); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if roleStr == "Admin RT" || roleStr == "Warga" {
		letter.RT = rtStr
		letter.RW = rwStr
	} else if roleStr == "Admin RW" {
		letter.RW = rwStr
	}

	userID, _ := c.Get("user_id")
	letter.ApplicantID = uint(userID.(float64))
	letter.Status = models.PendingRT

	if err := config.DB.Create(&letter).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create letter request"})
		return
	}

	c.JSON(http.StatusCreated, letter)
}

func GetLetterRequests(c *gin.Context) {
	rt, _ := c.Get("rt")
	rw, _ := c.Get("rw")
	role, _ := c.Get("role")

	rtStr, _ := rt.(string)
	rwStr, _ := rw.(string)
	roleStr, _ := role.(string)

	if roleStr != "Admin RT" && roleStr != "Admin RW" && roleStr != "Warga" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
		return
	}

	var letters []models.Letter
	query := config.DB

	if roleStr == "Admin RT" {
		query = query.Where("status = ? AND rt = ? AND rw = ?", models.PendingRT, rtStr, rwStr)
	} else if roleStr == "Admin RW" {
		query = query.Where("status = ? AND rw = ?", models.PendingRW, rwStr)
	} else if roleStr == "Warga" {
		userID, _ := c.Get("user_id")
		userIDVal, _ := userID.(float64)
		query = query.Where("applicant_id = ?", uint(userIDVal))
	}

	if err := query.Find(&letters).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch letter requests"})
		return
	}
	c.JSON(http.StatusOK, letters)
}

func ApproveLetter(c *gin.Context) {
	id := c.Param("id")
	rt, _ := c.Get("rt")
	rw, _ := c.Get("rw")
	role, _ := c.Get("role")

	rtStr, _ := rt.(string)
	rwStr, _ := rw.(string)
	roleStr, _ := role.(string)

	if roleStr != "Admin RT" && roleStr != "Admin RW" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
		return
	}

	var letter models.Letter
	query := config.DB

	if roleStr == "Admin RT" {
		query = query.Where("rt = ? AND rw = ?", rtStr, rwStr)
	} else if roleStr == "Admin RW" {
		query = query.Where("rw = ?", rwStr)
	}

	if err := query.First(&letter, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Letter request not found"})
		return
	}

	if roleStr == "Admin RT" && letter.Status == models.PendingRT {
		letter.Status = models.PendingRW
	} else if roleStr == "Admin RW" && letter.Status == models.PendingRW {
		letter.Status = models.Approved
		// Trigger PDF Generation Placeholder
		letter.PDFUrl = "/storage/letters/generated-letter-" + id + ".pdf"
	} else {
		c.JSON(http.StatusForbidden, gin.H{"error": "Invalid approval stage"})
		return
	}

	config.DB.Save(&letter)
	c.JSON(http.StatusOK, letter)
}

func RejectLetter(c *gin.Context) {
	id := c.Param("id")
	rt, _ := c.Get("rt")
	rw, _ := c.Get("rw")
	role, _ := c.Get("role")

	rtStr, _ := rt.(string)
	rwStr, _ := rw.(string)
	roleStr, _ := role.(string)

	if roleStr != "Admin RT" && roleStr != "Admin RW" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
		return
	}

	var letter models.Letter
	query := config.DB

	if roleStr == "Admin RT" {
		query = query.Where("rt = ? AND rw = ?", rtStr, rwStr)
	} else if roleStr == "Admin RW" {
		query = query.Where("rw = ?", rwStr)
	}

	if err := query.First(&letter, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Letter request not found"})
		return
	}

	if roleStr == "Admin RT" && letter.Status == models.PendingRT {
		letter.Status = models.Rejected
	} else if roleStr == "Admin RW" && letter.Status == models.PendingRW {
		letter.Status = models.Rejected
	} else {
		c.JSON(http.StatusForbidden, gin.H{"error": "Invalid rejection stage"})
		return
	}

	config.DB.Save(&letter)
	c.JSON(http.StatusOK, gin.H{"message": "Letter request rejected"})
}
