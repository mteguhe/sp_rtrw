package routes

import (
	"si-digi-rtrw-backend/controllers"
	"si-digi-rtrw-backend/middleware"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine) {
	// Serve static files from the uploads directory
	r.Static("/uploads", "./uploads")

	// Public routes
	r.POST("/api/login", controllers.Login)
	r.POST("/api/register", controllers.Register)
	r.GET("/api/public/announcements", controllers.GetPublicAnnouncements)

	// Protected routes
	api := r.Group("/api")
	api.Use(middleware.AuthMiddleware())
	{
		// Announcements
		api.GET("/announcements", controllers.GetAnnouncements)
		api.POST("/announcements", middleware.RoleMiddleware("Admin RT", "Admin RW"), controllers.CreateAnnouncement)

		// Family
		api.GET("/my-family", controllers.GetMyFamily)

		// Finance
		api.GET("/finance/reports", controllers.GetFinanceReports)
		api.GET("/finance/summary", controllers.GetBalanceSummary)
		api.POST("/finance/transaction", middleware.RoleMiddleware("Admin RT", "Admin RW"), controllers.AddTransaction)

		// Letters
		api.GET("/letters", controllers.GetLetterRequests)
		api.POST("/letters", controllers.CreateLetterRequest)
		api.POST("/letters/:id/approve", middleware.RoleMiddleware("Admin RT", "Admin RW"), controllers.ApproveLetter)
		api.POST("/letters/:id/reject", middleware.RoleMiddleware("Admin RT", "Admin RW"), controllers.RejectLetter)

		// Complaints
		api.POST("/complaints", controllers.CreateComplaint)
		api.GET("/complaints", controllers.GetComplaints)
		api.PUT("/complaints/:id/status", controllers.UpdateComplaintStatus)

		api.GET("/profile", func(c *gin.Context) {
			userID, _ := c.Get("user_id")
			role, _ := c.Get("role")
			c.JSON(200, gin.H{
				"user_id": userID,
				"role":    role,
			})
		})

		// Admin RT routes
		rt := api.Group("/rt")
		rt.Use(middleware.RoleMiddleware("Admin RT", "Admin RW"))
		{
			rt.GET("/residents", controllers.GetResidents)
			rt.POST("/residents", controllers.CreateResident)
			rt.GET("/families", controllers.GetFamilies)
			rt.POST("/families", controllers.CreateFamily)
			rt.GET("/families/:id", controllers.GetFamilyDetails)
		}

		// Admin RW routes
		rw := api.Group("/rw")
		rw.Use(middleware.RoleMiddleware("Admin RW"))
		{
			rw.GET("/stats", func(c *gin.Context) {
				c.JSON(200, gin.H{"message": "RW Level Statistics"})
			})
		}
	}
}
