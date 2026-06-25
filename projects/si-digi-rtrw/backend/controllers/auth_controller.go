package controllers

import (
	"net/http"
	"os"
	"time"

	"si-digi-rtrw-backend/config"
	"si-digi-rtrw-backend/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type LoginInput struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func Login(c *gin.Context) {
	var input LoginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := config.DB.Where("username = ?", input.Username).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid username or password"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid username or password"})
		return
	}

	// Load Resident to get RT/RW
	var resident models.Resident
	if user.ResidentID != nil {
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

	tokenString, err := token.SignedString([]byte(os.Getenv("JWT_SECRET")))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": tokenString,
		"user": gin.H{
			"id":       user.ID,
			"username": user.Username,
			"role":     user.Role,
		},
	})
}

func Register(c *gin.Context) {
	var input struct {
		Username string      `json:"username" binding:"required"`
		Password string      `json:"password" binding:"required"`
		Role     models.Role `json:"role" binding:"required"`
		NIK      string      `json:"nik"`
		AdminPin string      `json:"admin_pin"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 1. Validate Admin registration
	if input.Role == models.AdminRT || input.Role == models.AdminRW {
		expectedPin := os.Getenv("ADMIN_REGISTRATION_PIN")
		if expectedPin == "" {
			expectedPin = "rtrw-admin-secure-pin-2026" // Default fallback pin
		}
		if input.AdminPin != expectedPin {
			c.JSON(http.StatusForbidden, gin.H{"error": "Invalid admin registration pin"})
			return
		}
	}

	var residentID *uint = nil

	// 2. Validate Resident (Warga) linkage
	if input.Role == models.Warga {
		if input.NIK == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "NIK is required for Warga registration"})
			return
		}

		var resident models.Resident
		if err := config.DB.Where("nik = ?", input.NIK).First(&resident).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Resident NIK not registered by Admin. Please contact RT admin."})
			return
		}

		// Check if resident is already linked to another user account
		var existingUser models.User
		if err := config.DB.Where("resident_id = ?", resident.ID).First(&existingUser).Error; err == nil {
			c.JSON(http.StatusConflict, gin.H{"error": "An account is already registered for this NIK"})
			return
		}

		rid := resident.ID
		residentID = &rid
	} else if input.NIK != "" {
		// Optional linkage for Admins if they supply NIK
		var resident models.Resident
		if err := config.DB.Where("nik = ?", input.NIK).First(&resident).Error; err == nil {
			// Check if resident is already linked
			var existingUser models.User
			if err := config.DB.Where("resident_id = ?", resident.ID).First(&existingUser).Error; err != nil {
				rid := resident.ID
				residentID = &rid
			}
		}
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process password"})
		return
	}

	user := models.User{
		Username:   input.Username,
		Password:   string(hashedPassword),
		Role:       input.Role,
		ResidentID: residentID,
	}

	if err := config.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Username already exists or failed to create user"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Registration successful"})
}
