package controllers

import (
	"net/http"
	"si-digi-rtrw-backend/config"
	"si-digi-rtrw-backend/models"

	"github.com/gin-gonic/gin"
)

func GetRWStatistics(c *gin.Context) {
	rw, exists := c.Get("rw")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	rwStr, ok := rw.(string)
	if !ok || rwStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid RW value in context"})
		return
	}

	// 1. Total Residents
	var totalResidents int64
	if err := config.DB.Model(&models.Resident{}).Where("rw = ?", rwStr).Count(&totalResidents).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count residents"})
		return
	}

	// 2. Total Families
	var totalFamilies int64
	if err := config.DB.Model(&models.Family{}).Where("rw = ?", rwStr).Count(&totalFamilies).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count families"})
		return
	}

	// 3. Pending Letters (Menunggu RW)
	var pendingLetters int64
	if err := config.DB.Model(&models.Letter{}).Where("rw = ? AND status = ?", rwStr, models.PendingRW).Count(&pendingLetters).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count letters"})
		return
	}

	// 4. Active Complaints (Not Completed)
	var activeComplaints int64
	if err := config.DB.Model(&models.Complaint{}).Where("rw = ? AND status != ?", rwStr, models.StatusSelesai).Count(&activeComplaints).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count complaints"})
		return
	}

	// 5. Finance Summary
	var totalIncome float64
	var totalExpense float64

	config.DB.Model(&models.Finance{}).Where("rw = ? AND type = ?", rwStr, "Pemasukan").Select("COALESCE(SUM(amount), 0)").Row().Scan(&totalIncome)
	config.DB.Model(&models.Finance{}).Where("rw = ? AND type = ?", rwStr, "Pengeluaran").Select("COALESCE(SUM(amount), 0)").Row().Scan(&totalExpense)

	balance := totalIncome - totalExpense

	c.JSON(http.StatusOK, gin.H{
		"rw":                 rwStr,
		"total_residents":    totalResidents,
		"total_families":     totalFamilies,
		"pending_letters":    pendingLetters,
		"active_complaints":  activeComplaints,
		"total_income":       totalIncome,
		"total_expense":      totalExpense,
		"current_balance":    balance,
	})
}
