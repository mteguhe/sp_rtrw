package controllers

import (
	"bytes"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"si-digi-rtrw-backend/config"
	"si-digi-rtrw-backend/models"
	"time"

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

	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userIDVal, ok := userID.(float64)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	letter.ApplicantID = uint(userIDVal)

	if roleStr == "Warga" {
		letter.Status = models.PendingRT
	} else if roleStr == "Admin RT" {
		letter.Status = models.PendingRW
	} else if roleStr == "Admin RW" {
		letter.Status = models.Approved
	}
	letter.PDFUrl = ""

	if err := config.DB.Omit("Applicant", "Subject").Create(&letter).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create letter request"})
		return
	}

	// If it is approved, generate the PDF immediately
	if letter.Status == models.Approved {
		config.DB.Preload("Subject").First(&letter, letter.ID)
		pdfPath, err := GenerateLetterPDF(&letter)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate PDF: " + err.Error()})
			return
		}
		letter.PDFUrl = pdfPath
		if err := config.DB.Omit("Applicant", "Subject").Save(&letter).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update PDF URL"})
			return
		}
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
		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}
		userIDVal, ok := userID.(float64)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}
		query = query.Where("applicant_id = ?", uint(userIDVal))
	}

	if err := query.Preload("Applicant").Preload("Subject").Find(&letters).Error; err != nil {
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
	query := config.DB.Preload("Applicant").Preload("Subject")

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
		pdfPath, err := GenerateLetterPDF(&letter)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate PDF: " + err.Error()})
			return
		}
		letter.PDFUrl = pdfPath
	} else {
		c.JSON(http.StatusForbidden, gin.H{"error": "Invalid approval stage"})
		return
	}

	if err := config.DB.Omit("Applicant", "Subject").Save(&letter).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save letter approval"})
		return
	}
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

	if err := config.DB.Omit("Applicant", "Subject").Save(&letter).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save letter rejection"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Letter request rejected"})
}

func GenerateLetterPDF(letter *models.Letter) (string, error) {
	uploadDir := "./uploads/letters"
	if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
		return "", err
	}

	fileName := fmt.Sprintf("generated-letter-%d.pdf", letter.ID)
	filePath := filepath.Join(uploadDir, fileName)

	pdf := buildPDFBytes(letter)

	if err := os.WriteFile(filePath, pdf, 0644); err != nil {
		return "", err
	}

	return "/uploads/letters/" + fileName, nil
}

func buildPDFBytes(letter *models.Letter) []byte {
	var buf bytes.Buffer
	var offsets []int

	writeObj := func(objStr string) {
		offsets = append(offsets, buf.Len())
		buf.WriteString(objStr)
	}

	buf.WriteString("%PDF-1.4\n")
	writeObj("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")
	writeObj("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n")

	dateStr := time.Now().Format("02 January 2006")
	subjectName := "Warga"
	subjectNIK := "-"
	if letter.Subject.FullName != "" {
		subjectName = letter.Subject.FullName
	}
	if letter.Subject.NIK != "" {
		subjectNIK = letter.Subject.NIK
	}

	escapePDF := func(s string) string {
		var out bytes.Buffer
		for i := 0; i < len(s); i++ {
			c := s[i]
			if c == '(' || c == ')' || c == '\\' {
				out.WriteByte('\\')
			}
			out.WriteByte(c)
		}
		return out.String()
	}

	title := escapePDF(letter.Type)
	name := escapePDF(subjectName)
	nik := escapePDF(subjectNIK)
	purpose := escapePDF(letter.Purpose)
	validity := escapePDF(letter.Validity)
	rtVal := escapePDF(letter.RT)
	rwVal := escapePDF(letter.RW)

	streamContent := fmt.Sprintf("BT\n"+
		"/F1 16 Tf\n"+
		"70 270 Td\n"+
		"0 480 Td\n"+
		"(RUKUN TETANGGA %s / RUKUN WARGA %s) Tj\n"+
		"0 -25 Td\n"+
		"(SI-DIGI RT/RW DIGITAL ADMINISTRATION) Tj\n"+
		"0 -15 Td\n"+
		"/F1 10 Tf\n"+
		"(Alamat: Wilayah RT %s / RW %s, Jawa Barat, Indonesia) Tj\n"+
		"0 -15 Td\n"+
		"(------------------------------------------------------------------------------------------------------------------------) Tj\n"+
		"0 -40 Td\n"+
		"/F1 14 Tf\n"+
		"180 0 Td\n"+
		"(%s) Tj\n"+
		"-180 -15 Td\n"+
		"/F1 10 Tf\n"+
		"(                                               Nomor Surat: Ref/RT%s/RW%s/%d) Tj\n"+
		"0 -45 Td\n"+
		"(Yang bertanda tangan di bawah ini Pengurus RT %s / RW %s dengan ini menerangkan bahwa:) Tj\n"+
		"0 -30 Td\n"+
		"(        Nama Lengkap    :  %s) Tj\n"+
		"0 -20 Td\n"+
		"(        NIK                      :  %s) Tj\n"+
		"0 -20 Td\n"+
		"(        Alamat                 :  RT %s / RW %s) Tj\n"+
		"0 -30 Td\n"+
		"(Orang tersebut di atas adalah benar warga kami yang bertempat tinggal di lingkungan kami.) Tj\n"+
		"0 -20 Td\n"+
		"(Surat pengantar ini dibuat untuk keperluan:) Tj\n"+
		"0 -20 Td\n"+
		"(        >> %s) Tj\n"+
		"0 -30 Td\n"+
		"(Masa berlaku surat keterangan ini adalah %s sejak tanggal diterbitkan.) Tj\n"+
		"0 -30 Td\n"+
		"(Demikian surat pengantar ini dibuat dengan sebenarnya agar dapat dipergunakan sebagaimana mestinya.) Tj\n"+
		"0 -60 Td\n"+
		"300 0 Td\n"+
		"(Diterbitkan pada: %s) Tj\n"+
		"0 -20 Td\n"+
		"(Mengetahui,) Tj\n"+
		"0 -15 Td\n"+
		"(Ketua RT %s / RW %s) Tj\n"+
		"0 -60 Td\n"+
		"(___________________________) Tj\n"+
		"ET\n",
		rtVal, rwVal, rtVal, rwVal, title, rtVal, rwVal, letter.ID, rtVal, rwVal, name, nik, rtVal, rwVal, purpose, validity, dateStr, rtVal, rwVal)

	streamLength := len(streamContent)

	writeObj("3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 595 842] /Contents 5 0 R >>\nendobj\n")
	writeObj("4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n")

	writeObj(fmt.Sprintf("5 0 obj\n<< /Length %d >>\nstream\n%s\nendstream\nendobj\n", streamLength, streamContent))

	xrefOffset := buf.Len()
	buf.WriteString("xref\n0 6\n")
	buf.WriteString("0000000000 65535 f \n")
	for _, offset := range offsets {
		buf.WriteString(fmt.Sprintf("%010d 00000 n \n", offset))
	}

	buf.WriteString("trailer\n<< /Size 6 /Root 1 0 R >>\n")
	buf.WriteString("startxref\n")
	buf.WriteString(fmt.Sprintf("%d\n", xrefOffset))
	buf.WriteString("%%EOF\n")

	return buf.Bytes()
}
