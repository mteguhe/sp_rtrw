package main

import (
	"fmt"
	"net/http"
	"os"

	"si-digi-rtrw-backend/config"
	"si-digi-rtrw-backend/models"
	"si-digi-rtrw-backend/routes"

	"github.com/gin-gonic/gin"
)

func main() {
	// Initialize Database
	config.ConnectDatabase()

	// Auto Migration (order matters: parents first to avoid FK errors)
	fmt.Println("Running Auto Migration...")
	config.DB.Exec("SET FOREIGN_KEY_CHECKS = 0;")
	config.DB.AutoMigrate(&models.Family{}, &models.Resident{}, &models.User{}, &models.Announcement{}, &models.Finance{}, &models.Letter{}, &models.Complaint{})
	config.DB.Exec("SET FOREIGN_KEY_CHECKS = 1;")

	// Setup Router
	r := gin.Default()

	// Setup Routes
	routes.SetupRoutes(r)

	// Basic Route
	r.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "Welcome to SI-DIGI RT/RW API",
		})
	})

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "UP",
		})
	})

	// Get Port from env
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Printf("Server starting on port %s...\n", port)
	r.Run(":" + port)
}
