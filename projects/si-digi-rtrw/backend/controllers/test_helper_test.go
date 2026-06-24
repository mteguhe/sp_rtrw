package controllers_test

import (
	"si-digi-rtrw-backend/config"
	"si-digi-rtrw-backend/models"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func setupTestDB() {
	dsn := "root:rootpassword@tcp(127.0.0.1:3306)/si_digi_rtrw_test?charset=utf8mb4&parseTime=True&loc=Local"
	var err error
	config.DB, err = gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		dsn = "root:root@tcp(127.0.0.1:3306)/si_digi_rtrw_test?charset=utf8mb4&parseTime=True&loc=Local"
		config.DB, err = gorm.Open(mysql.Open(dsn), &gorm.Config{})
		if err != nil {
			panic("Failed to connect to test database: " + err.Error())
		}
	}

	config.DB.AutoMigrate(
		&models.Family{},
		&models.Resident{},
		&models.User{},
		&models.Announcement{},
		&models.Finance{},
		&models.Letter{},
		&models.Complaint{},
	)

	config.DB.Exec("SET FOREIGN_KEY_CHECKS = 0;")
	config.DB.Unscoped().Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&models.Announcement{})
	config.DB.Unscoped().Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&models.User{})
	config.DB.Unscoped().Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&models.Resident{})
	config.DB.Unscoped().Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&models.Family{})
	config.DB.Unscoped().Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&models.Letter{})
	config.DB.Unscoped().Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&models.Finance{})
	config.DB.Unscoped().Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&models.Complaint{})
	config.DB.Exec("SET FOREIGN_KEY_CHECKS = 1;")
}
