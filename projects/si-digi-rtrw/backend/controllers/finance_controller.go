package controllers

import (
	"net/http"
	"si-digi-rtrw-backend/config"
	"si-digi-rtrw-backend/models"
	"time"

	"github.com/gin-gonic/gin"
)

func GetFinanceReports(c *gin.Context) {
	rt, _ := c.Get("rt")
	rw, _ := c.Get("rw")
	role, _ := c.Get("role")

	rtStr, _ := rt.(string)
	rwStr, _ := rw.(string)
	roleStr, _ := role.(string)

	if roleStr != "Admin RW" && roleStr != "Admin RT" && roleStr != "Warga" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
		return
	}

	level := c.Query("level") // RT or RW
	var reports []models.Finance

	query := config.DB.Where("rw = ?", rwStr)

	if roleStr == "Admin RT" || roleStr == "Warga" {
		if level == "RT" {
			query = query.Where("level = ? AND rt = ?", "RT", rtStr)
		} else if level == "RW" {
			query = query.Where("level = ?", "RW")
		} else {
			query = query.Where("level = 'RW' OR (level = 'RT' AND rt = ?)", rtStr)
		}
	} else if roleStr == "Admin RW" {
		if level != "" {
			query = query.Where("level = ?", level)
		}
	}

	query.Find(&reports)
	c.JSON(http.StatusOK, reports)
}

func AddTransaction(c *gin.Context) {
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

	var transaction models.Finance
	if err := c.ShouldBindJSON(&transaction); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if transaction.Date.IsZero() {
		transaction.Date = time.Now()
	}

	if roleStr == "Admin RT" {
		transaction.RT = rtStr
		transaction.RW = rwStr
		transaction.Level = "RT"
	} else if roleStr == "Admin RW" {
		transaction.RW = rwStr
		if transaction.Level != "RT" && transaction.Level != "RW" {
			transaction.Level = "RW"
		}
		if transaction.Level == "RT" && transaction.RT == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "RT must be specified for RT-level transactions"})
			return
		}
		if transaction.Level == "RW" {
			transaction.RT = ""
		}
	}

	if err := config.DB.Create(&transaction).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to record transaction"})
		return
	}

	c.JSON(http.StatusCreated, transaction)
}

func GetBalanceSummary(c *gin.Context) {
	rt, _ := c.Get("rt")
	rw, _ := c.Get("rw")
	role, _ := c.Get("role")

	rtStr, _ := rt.(string)
	rwStr, _ := rw.(string)
	roleStr, _ := role.(string)

	if roleStr != "Admin RW" && roleStr != "Admin RT" && roleStr != "Warga" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
		return
	}

	level := c.Query("level")
	var income, expense float64

	queryIncome := config.DB.Model(&models.Finance{}).Where("type = ? AND rw = ?", "Pemasukan", rwStr)
	queryExpense := config.DB.Model(&models.Finance{}).Where("type = ? AND rw = ?", "Pengeluaran", rwStr)

	if roleStr == "Admin RT" || roleStr == "Warga" {
		if level == "RT" {
			queryIncome = queryIncome.Where("level = ? AND rt = ?", "RT", rtStr)
			queryExpense = queryExpense.Where("level = ? AND rt = ?", "RT", rtStr)
		} else if level == "RW" {
			queryIncome = queryIncome.Where("level = ?", "RW")
			queryExpense = queryExpense.Where("level = ?", "RW")
		} else {
			queryIncome = queryIncome.Where("level = 'RW' OR (level = 'RT' AND rt = ?)", rtStr)
			queryExpense = queryExpense.Where("level = 'RW' OR (level = 'RT' AND rt = ?)", rtStr)
		}
	} else if roleStr == "Admin RW" {
		if level != "" {
			queryIncome = queryIncome.Where("level = ?", level)
			queryExpense = queryExpense.Where("level = ?", level)
		}
	}

	queryIncome.Select("COALESCE(SUM(amount), 0)").Scan(&income)
	queryExpense.Select("COALESCE(SUM(amount), 0)").Scan(&expense)

	c.JSON(http.StatusOK, gin.H{
		"total_income":  income,
		"total_expense": expense,
		"balance":       income - expense,
	})
}
