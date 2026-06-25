package models

import (
	"time"

	"gorm.io/gorm"
)

type Role string

const (
	AdminRW Role = "Admin RW"
	AdminRT Role = "Admin RT"
	Warga   Role = "Warga"
)

type User struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Username  string         `gorm:"unique;not null" json:"username"`
	Password  string         `gorm:"not null" json:"-"`
	Role      Role           `gorm:"type:enum('Admin RW', 'Admin RT', 'Warga');not null" json:"role"`
	ResidentID *uint         `json:"resident_id"`
	Resident   Resident      `gorm:"foreignKey:ResidentID" json:"resident"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

type Resident struct {
	ID            uint           `gorm:"primaryKey" json:"id"`
	NIK           string         `gorm:"unique;not null" json:"nik"`
	FullName      string         `gorm:"not null" json:"full_name"`
	PlaceOfBirth  string         `json:"place_of_birth"`
	DateOfBirth   time.Time      `json:"date_of_birth"`
	Gender        string         `json:"gender"`
	Address       string         `json:"address"`
	RT            string         `json:"rt"`
	RW            string         `json:"rw"`
	Status        string         `json:"status"` // Pindahan, Lahir, Meninggal, Tetap
	FamilyID      uint           `json:"family_id"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
}

type Family struct {
	ID             uint           `gorm:"primaryKey" json:"id"`
	NoKK           string         `gorm:"unique;not null" json:"no_kk"`
	Address        string         `json:"address"`
	RT             string         `json:"rt"`
	RW             string         `json:"rw"`
	HeadOfFamilyID uint           `json:"head_of_family_id"`
	Residents      []Resident     `gorm:"foreignKey:FamilyID" json:"residents"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
}

type Announcement struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Title     string         `gorm:"not null" json:"title"`
	Content   string         `gorm:"type:text;not null" json:"content"`
	AuthorID  uint           `json:"author_id"`
	Author    User           `gorm:"foreignKey:AuthorID" json:"author"`
	Level     string         `json:"level"` // RT, RW, Publik
	RT        string         `json:"rt"`
	RW        string         `json:"rw"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

type Finance struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	Amount      float64        `gorm:"not null" json:"amount"`
	Type        string         `gorm:"type:enum('Pemasukan', 'Pengeluaran');not null" json:"type"`
	Category    string         `json:"category"` // Kebersihan, Keamanan, Kas, dll
	Description string         `json:"description"`
	Level       string         `gorm:"index" json:"level"` // RT, RW
	RT          string         `gorm:"index" json:"rt"`
	RW          string         `gorm:"index" json:"rw"`
	Date        time.Time      `json:"date"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

type LetterStatus string

const (
	PendingRT LetterStatus = "Menunggu RT"
	PendingRW LetterStatus = "Menunggu RW"
	Approved  LetterStatus = "Selesai"
	Rejected  LetterStatus = "Ditolak"
)

type Letter struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	Type        string         `json:"type"` // Domisili, Pengantar
	ApplicantID uint           `json:"applicant_id"` // User who applied
	Applicant   User           `gorm:"foreignKey:ApplicantID" json:"applicant"`
	SubjectID   uint           `json:"subject_id"`   // Resident the letter is for
	Subject     Resident       `gorm:"foreignKey:SubjectID" json:"subject"`
	Purpose     string         `json:"purpose"`
	Validity    string         `json:"validity"`
	Status      LetterStatus   `gorm:"type:varchar(20);default:'Menunggu RT'" json:"status"`
	PDFUrl      string         `json:"pdf_url"`
	RT          string         `json:"rt"`
	RW          string         `json:"rw"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

type ComplaintStatus string

const (
	StatusDiterima ComplaintStatus = "Diterima"
	StatusDiproses ComplaintStatus = "Diproses"
	StatusSelesai  ComplaintStatus = "Selesai"
)

type Complaint struct {
	ID          uint            `gorm:"primaryKey" json:"id"`
	Title       string          `gorm:"not null" json:"title"`
	Description string          `gorm:"type:text;not null" json:"description"`
	PhotoURL    string          `gorm:"not null" json:"photo_url"`
	Status      ComplaintStatus `gorm:"type:varchar(20);default:'Diterima'" json:"status"`
	ReporterID  uint            `json:"reporter_id"`
	Reporter    User            `gorm:"foreignKey:ReporterID" json:"reporter"`
	RT          string          `json:"rt"`
	RW          string          `json:"rw"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
	DeletedAt   gorm.DeletedAt  `gorm:"index" json:"-"`
}

