package controllers

import (
	"net/http"
	"si-digi-rtrw-backend/config"
	"si-digi-rtrw-backend/models"

	"github.com/gin-gonic/gin"
)

// CRUD Residents
func GetResidents(c *gin.Context) {
	rt, _ := c.Get("rt")
	rw, _ := c.Get("rw")
	role, _ := c.Get("role")

	rtStr, _ := rt.(string)
	rwStr, _ := rw.(string)

	var residents []models.Resident
	query := config.DB

	if role == "Admin RT" {
		query = query.Where("rt = ? AND rw = ?", rtStr, rwStr)
	} else if role == "Admin RW" {
		query = query.Where("rw = ?", rwStr)
	} else {
		c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
		return
	}

	query.Find(&residents)
	c.JSON(http.StatusOK, residents)
}

func CreateResident(c *gin.Context) {
	rt, _ := c.Get("rt")
	rw, _ := c.Get("rw")
	role, _ := c.Get("role")

	rtStr, _ := rt.(string)
	rwStr, _ := rw.(string)

	if role != "Admin RT" && role != "Admin RW" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
		return
	}

	var resident models.Resident
	if err := c.ShouldBindJSON(&resident); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if role == "Admin RT" {
		resident.RT = rtStr
		resident.RW = rwStr
	} else if role == "Admin RW" {
		resident.RW = rwStr
	}

	// Verify FamilyID scope
	if resident.FamilyID != 0 {
		var fam models.Family
		if err := config.DB.First(&fam, resident.FamilyID).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Family not found"})
			return
		}
		if role == "Admin RT" && (fam.RT != rtStr || fam.RW != rwStr) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Family belongs to a different RT/RW scope"})
			return
		}
		if role == "Admin RW" && fam.RW != rwStr {
			c.JSON(http.StatusForbidden, gin.H{"error": "Family belongs to a different RW scope"})
			return
		}
	}

	if err := config.DB.Create(&resident).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create resident"})
		return
	}

	c.JSON(http.StatusCreated, resident)
}

// CRUD Families
func GetFamilies(c *gin.Context) {
	rt, _ := c.Get("rt")
	rw, _ := c.Get("rw")
	role, _ := c.Get("role")

	rtStr, _ := rt.(string)
	rwStr, _ := rw.(string)

	var families []models.Family
	query := config.DB

	if role == "Admin RT" {
		query = query.Where("rt = ? AND rw = ?", rtStr, rwStr)
		query = query.Preload("Residents", "rt = ? AND rw = ?", rtStr, rwStr)
	} else if role == "Admin RW" {
		query = query.Where("rw = ?", rwStr)
		query = query.Preload("Residents", "rw = ?", rwStr)
	} else {
		c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
		return
	}

	query.Find(&families)
	c.JSON(http.StatusOK, families)
}

func CreateFamily(c *gin.Context) {
	rt, _ := c.Get("rt")
	rw, _ := c.Get("rw")
	role, _ := c.Get("role")

	rtStr, _ := rt.(string)
	rwStr, _ := rw.(string)

	if role != "Admin RT" && role != "Admin RW" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
		return
	}

	var family models.Family
	if err := c.ShouldBindJSON(&family); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if role == "Admin RT" {
		family.RT = rtStr
		family.RW = rwStr
	} else if role == "Admin RW" {
		family.RW = rwStr
	}

	// Verify HeadOfFamilyID scope
	if family.HeadOfFamilyID != 0 {
		var head models.Resident
		if err := config.DB.First(&head, family.HeadOfFamilyID).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Head of family resident not found"})
			return
		}
		if role == "Admin RT" && (head.RT != rtStr || head.RW != rwStr) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Head of family belongs to a different RT/RW scope"})
			return
		}
		if role == "Admin RW" && head.RW != rwStr {
			c.JSON(http.StatusForbidden, gin.H{"error": "Head of family belongs to a different RW scope"})
			return
		}
	}

	// Force same scope for nested residents
	for i := range family.Residents {
		family.Residents[i].RW = family.RW
		if role == "Admin RT" {
			family.Residents[i].RT = family.RT
		}
	}

	if err := config.DB.Create(&family).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create family"})
		return
	}

	c.JSON(http.StatusCreated, family)
}

func GetFamilyDetails(c *gin.Context) {
	rt, _ := c.Get("rt")
	rw, _ := c.Get("rw")
	role, _ := c.Get("role")

	rtStr, _ := rt.(string)
	rwStr, _ := rw.(string)

	id := c.Param("id")
	var family models.Family
	query := config.DB

	if role == "Admin RT" {
		query = query.Where("rt = ? AND rw = ?", rtStr, rwStr)
		query = query.Preload("Residents", "rt = ? AND rw = ?", rtStr, rwStr)
	} else if role == "Admin RW" {
		query = query.Where("rw = ?", rwStr)
		query = query.Preload("Residents", "rw = ?", rwStr)
	} else {
		c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
		return
	}

	if err := query.First(&family, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Family not found"})
		return
	}
	c.JSON(http.StatusOK, family)
}
