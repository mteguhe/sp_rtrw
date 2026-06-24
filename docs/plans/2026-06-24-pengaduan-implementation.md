# Modul Tiket Pengaduan (Complaints) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the digital complaints module allowing citizens to upload reports with photo proof, and admins to manage the ticket status (Diterima -> Diproses -> Selesai).

**Architecture:** Add `Complaint` model in GORM with file-upload backend support. Create Gin API handlers with local static file serving, and implement a responsive tabbed UI page in React.

**Tech Stack:** Go (Golang), Gin, GORM, MySQL, React, TypeScript, TailwindCSS, Lucide Icons, Axios.

---

### Task 1: Update Go Database Models and Migrations

**Files:**
- Modify: `projects/si-digi-rtrw/backend/models/models.go`
- Modify: `projects/si-digi-rtrw/backend/controllers/test_helper_test.go`

- [ ] **Step 1: Add Complaint model to models.go**
  Add the following code to `projects/si-digi-rtrw/backend/models/models.go` around line 88 (above or below `Letter` model):
  ```go
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
  ```

- [ ] **Step 2: Add Complaint migration and cleanup in test_helper_test.go**
  Modify `projects/si-digi-rtrw/backend/controllers/test_helper_test.go`:
  Add `&models.Complaint{}` to `AutoMigrate` at line 23-30:
  ```go
  	config.DB.AutoMigrate(
  		&models.Family{},
  		&models.Resident{},
  		&models.User{},
  		&models.Announcement{},
  		&models.Finance{},
  		&models.Letter{},
  		&models.Complaint{},
  	)
  ```
  Add cleanup of `Complaint` table in `setupTestDB()`:
  ```go
  	config.DB.Exec("SET FOREIGN_KEY_CHECKS = 0;")
  	config.DB.Unscoped().Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&models.Announcement{})
  	config.DB.Unscoped().Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&models.User{})
  	config.DB.Unscoped().Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&models.Resident{})
  	config.DB.Unscoped().Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&models.Family{})
  	config.DB.Unscoped().Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&models.Letter{})
  	config.DB.Unscoped().Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&models.Finance{})
  	config.DB.Unscoped().Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&models.Complaint{})
  	config.DB.Exec("SET FOREIGN_KEY_CHECKS = 1;")
  ```

- [ ] **Step 3: Run backend tests to verify GORM migrations compile**
  Run: `go test ./projects/si-digi-rtrw/backend/controllers/... -v`
  Expected: PASS

- [ ] **Step 4: Commit changes**
  Run:
  ```bash
  git add projects/si-digi-rtrw/backend/models/models.go projects/si-digi-rtrw/backend/controllers/test_helper_test.go
  git commit -m "feat(backend): add Complaint GORM model and database migrations"
  ```

---

### Task 2: Implement Backend API and Integration Tests

**Files:**
- Create: `projects/si-digi-rtrw/backend/controllers/complaint_controller_test.go`
- Create: `projects/si-digi-rtrw/backend/controllers/complaint_controller.go`
- Modify: `projects/si-digi-rtrw/backend/routes/routes.go`

- [ ] **Step 1: Write failing integration test for complaints**
  Create `projects/si-digi-rtrw/backend/controllers/complaint_controller_test.go`:
  ```go
  package controllers_test

  import (
  	"bytes"
  	"encoding/json"
  	"mime/multipart"
  	"net/http"
  	"net/http/httptest"
  	"testing"
  	"time"

  	"si-digi-rtrw-backend/config"
  	"si-digi-rtrw-backend/controllers"
  	"si-digi-rtrw-backend/models"

  	"github.com/gin-gonic/gin"
  )

  func TestComplaintWorkflow(t *testing.T) {
  	setupTestDB()
  	gin.SetMode(gin.TestMode)

  	// Seed User & Resident
  	fam := models.Family{NoKK: "55554444", Address: "Blok A", RT: "01", RW: "03"}
  	config.DB.Create(&fam)
  	res := models.Resident{FullName: "Lapor Warga", RT: "01", RW: "03", NIK: "55551111", DateOfBirth: time.Now(), FamilyID: fam.ID}
  	config.DB.Create(&res)
  	user := models.User{Username: "lapor_warga", Password: "pwd", Role: "Warga", ResidentID: res.ID}
  	config.DB.Create(&user)

  	r := gin.New()
  	r.POST("/api/complaints", func(c *gin.Context) {
  		c.Set("role", "Warga")
  		c.Set("user_id", float64(user.ID))
  		c.Set("rt", "01")
  		c.Set("rw", "03")
  		controllers.CreateComplaint(c)
  	})
  	r.GET("/api/complaints", func(c *gin.Context) {
  		c.Set("role", "Admin RT")
  		c.Set("rt", "01")
  		c.Set("rw", "03")
  		controllers.GetComplaints(c)
  	})

  	// Create multipart mock request body for photo upload
  	body := &bytes.Buffer{}
  	writer := multipart.NewWriter(body)
  	_ = writer.WriteField("title", "Jalan Berlubang")
  	_ = writer.WriteField("description", "Lubang besar di RT 01 membahayakan pengendara")
  	part, _ := writer.CreateFormFile("photo", "test_photo.png")
  	_, _ = part.Write([]byte("fake image data"))
  	_ = writer.Close()

  	// 1. Submit complaint
  	req, _ := http.NewRequest("POST", "/api/complaints", body)
  	req.Header.Set("Content-Type", writer.FormDataContentType())
  	w := httptest.NewRecorder()
  	r.ServeHTTP(w, req)

  	if w.Code != http.StatusCreated {
  		t.Fatalf("Expected 201 Created, got %d. Body: %s", w.Code, w.Body.String())
  	}

  	var created models.Complaint
  	json.Unmarshal(w.Body.Bytes(), &created)
  	if created.Title != "Jalan Berlubang" || created.PhotoURL == "" {
  		t.Errorf("Expected populated complaint fields, got %+v", created)
  	}

  	// 2. Fetch list of complaints as Admin RT
  	req2, _ := http.NewRequest("GET", "/api/complaints", nil)
  	w2 := httptest.NewRecorder()
  	r.ServeHTTP(w2, req2)

  	if w2.Code != http.StatusOK {
  		t.Fatalf("Expected 200 OK, got %d", w2.Code)
  	}

  	var list []models.Complaint
  	json.Unmarshal(w2.Body.Bytes(), &list)
  	if len(list) != 1 {
  		t.Fatalf("Expected 1 complaint in list, got %d", len(list))
  	}
  }
  ```

- [ ] **Step 2: Run test to verify compilation failure**
  Run: `go test ./projects/si-digi-rtrw/backend/controllers/... -run TestComplaintWorkflow`
  Expected: FAIL (compilation error, controllers functions undefined)

- [ ] **Step 3: Implement controller functions in complaint_controller.go**
  Create `projects/si-digi-rtrw/backend/controllers/complaint_controller.go`:
  ```go
  package controllers

  import (
  	"fmt"
  	"net/http"
  	"os"
  	"path/filepath"
  	"si-digi-rtrw-backend/config"
  	"si-digi-rtrw-backend/models"
  	"time"

  	"github.com/gin-gonic/gin"
  )

  func CreateComplaint(c *gin.Context) {
  	rt, _ := c.Get("rt")
  	rw, _ := c.Get("rw")
  	userID, exists := c.Get("user_id")

  	if !exists {
  		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
  		return
  	}

  	var uID uint
  	switch v := userID.(type) {
  	case float64:
  		uID = uint(v)
  	case uint:
  		uID = v
  	case int:
  		uID = uint(v)
  	default:
  		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID type"})
  		return
  	}

  	title := c.PostForm("title")
  	description := c.PostForm("description")

  	if title == "" || description == "" {
  		c.JSON(http.StatusBadRequest, gin.H{"error": "Title and description are required"})
  		return
  	}

  	// Handle Photo Upload
  	file, err := c.FormFile("photo")
  	if err != nil {
  		c.JSON(http.StatusBadRequest, gin.H{"error": "Photo file is required"})
  		return
  	}

  	// Ensure uploads directory exists
  	uploadDir := "./uploads/complaints"
  	if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
  		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create upload directory"})
  		return
  	}

  	filename := fmt.Sprintf("complaint-%d-%s", time.Now().UnixNano(), filepath.Base(file.Filename))
  	filePath := filepath.Join(uploadDir, filename)

  	if err := c.SaveUploadedFile(file, filePath); err != nil {
  		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save uploaded file"})
  		return
  	}

  	photoURL := "/uploads/complaints/" + filename

  	complaint := models.Complaint{
  		Title:       title,
  		Description: description,
  		PhotoURL:    photoURL,
  		Status:      models.StatusDiterima,
  		ReporterID:  uID,
  		RT:          rt.(string),
  		RW:          rw.(string),
  	}

  	if err := config.DB.Omit("Reporter").Create(&complaint).Error; err != nil {
  		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save complaint to database"})
  		return
  	}

  	c.JSON(http.StatusCreated, complaint)
  }

  func GetComplaints(c *gin.Context) {
  	rt, _ := c.Get("rt")
  	rw, _ := c.Get("rw")
  	role, _ := c.Get("role")

  	rtStr, _ := rt.(string)
  	rwStr, _ := rw.(string)
  	roleStr, _ := role.(string)

  	var list []models.Complaint
  	query := config.DB.Preload("Reporter").Preload("Reporter.Resident")

  	if roleStr == "Admin RT" {
  		query = query.Where("rt = ? AND rw = ?", rtStr, rwStr)
  	} else {
  		// Admin RW and Warga can see all complaints in their RW (since system serves 1 RW)
  		query = query.Where("rw = ?", rwStr)
  	}

  	if err := query.Find(&list).Error; err != nil {
  		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch complaints"})
  		return
  	}

  	c.JSON(http.StatusOK, list)
  }

  func UpdateComplaintStatus(c *gin.Context) {
  	id := c.Param("id")
  	role, _ := c.Get("role")
  	rt, _ := c.Get("rt")
  	rw, _ := c.Get("rw")

  	roleStr, _ := role.(string)
  	rtStr, _ := rt.(string)
  	rwStr, _ := rw.(string)

  	if roleStr != "Admin RT" && roleStr != "Admin RW" {
  		c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
  		return
  	}

  	var payload struct {
  		Status models.ComplaintStatus `json:"status" binding:"required"`
  	}

  	if err := c.ShouldBindJSON(&payload); err != nil {
  		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
  		return
  	}

  	if payload.Status != models.StatusDiterima && payload.Status != models.StatusDiproses && payload.Status != models.StatusSelesai {
  		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid status value"})
  		return
  	}

  	var complaint models.Complaint
  	dbQuery := config.DB

  	if roleStr == "Admin RT" {
  		dbQuery = dbQuery.Where("rt = ? AND rw = ?", rtStr, rwStr)
  	} else if roleStr == "Admin RW" {
  		dbQuery = dbQuery.Where("rw = ?", rwStr)
  	}

  	if err := dbQuery.First(&complaint, id).Error; err != nil {
  		c.JSON(http.StatusNotFound, gin.H{"error": "Complaint not found or out of scope"})
  		return
  	}

  	complaint.Status = payload.Status
  	if err := config.DB.Omit("Reporter").Save(&complaint).Error; err != nil {
  		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update complaint status"})
  		return
  	}

  	c.JSON(http.StatusOK, complaint)
  }
  ```

- [ ] **Step 4: Register routes and static path in routes.go**
  Modify `projects/si-digi-rtrw/backend/routes/routes.go`:
  Add route registrations and static upload serving under `SetupRoutes`:
  ```go
  func SetupRoutes(r *gin.Engine) {
  	// Serve static files from the uploads directory
  	r.Static("/uploads", "./uploads")

  	// Public routes
  	r.POST("/api/login", controllers.Login)
  ```
  Inside protected routes block:
  ```go
  		// Letters
  		api.GET("/letters", controllers.GetLetterRequests)
  		api.POST("/letters", controllers.CreateLetterRequest)
  		// ...

  		// Complaints
  		api.POST("/complaints", controllers.CreateComplaint)
  		api.GET("/complaints", controllers.GetComplaints)
  		api.PUT("/complaints/:id/status", controllers.UpdateComplaintStatus)
  ```

- [ ] **Step 5: Run tests to verify all backend integration tests pass**
  Run: `go test ./projects/si-digi-rtrw/backend/... -v`
  Expected: PASS (Including the new `TestComplaintWorkflow` test)

- [ ] **Step 6: Commit changes**
  Run:
  ```bash
  git add projects/si-digi-rtrw/backend/controllers/complaint_controller.go projects/si-digi-rtrw/backend/controllers/complaint_controller_test.go projects/si-digi-rtrw/backend/routes/routes.go
  git commit -m "feat(backend): implement Complaints endpoint with file upload, static serving, and tests"
  ```

---

### Task 3: Setup Frontend Navigation & Router

**Files:**
- Modify: `projects/si-digi-rtrw/frontend/src/components/DashboardLayout.tsx`
- Modify: `projects/si-digi-rtrw/frontend/src/App.tsx`
- Create: `projects/si-digi-rtrw/frontend/src/pages/admin/Complaints.tsx` (Scaffold placeholder)

- [ ] **Step 1: Add new sidebar links to DashboardLayout.tsx**
  Edit `projects/si-digi-rtrw/frontend/src/components/DashboardLayout.tsx` to add imports and links.
  Modify line 3 to import `FileText`, `Bell`, `AlertTriangle`:
  ```typescript
  import { Users, LogOut, DollarSign, FileText, Bell, AlertTriangle } from 'lucide-react';
  ```
  Add active link checking around line 17:
  ```typescript
    const isLettersActive = location.pathname === '/admin/letters';
    const isAnnouncementsActive = location.pathname === '/admin/announcements';
    const isComplaintsActive = location.pathname === '/admin/complaints';
  ```
  Add links to sidebar navigation around line 66:
  ```typescript
          <nav className="mt-8 space-y-2">
            <Link 
              to="/admin/residents" 
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${
                isResidentsActive 
                  ? 'text-primary bg-primary/10' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              <Users className="w-5 h-5" />
              Data Warga
            </Link>
            <Link 
              to="/admin/letters" 
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${
                isLettersActive 
                  ? 'text-primary bg-primary/10' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              <FileText className="w-5 h-5" />
              Persuratan
            </Link>
            <Link 
              to="/admin/finance" 
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${
                isFinanceActive 
                  ? 'text-primary bg-primary/10' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              <DollarSign className="w-5 h-5" />
              Keuangan Kas
            </Link>
            <Link 
              to="/admin/announcements" 
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${
                isAnnouncementsActive 
                  ? 'text-primary bg-primary/10' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              <Bell className="w-5 h-5" />
              Pengumuman
            </Link>
            <Link 
              to="/admin/complaints" 
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${
                isComplaintsActive 
                  ? 'text-primary bg-primary/10' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
              Pengaduan
            </Link>
          </nav>
  ```

- [ ] **Step 2: Create placeholder Complaints.tsx component**
  Create `projects/si-digi-rtrw/frontend/src/pages/admin/Complaints.tsx`:
  ```typescript
  import React from 'react';
  import DashboardLayout from '../../components/DashboardLayout';

  const Complaints: React.FC = () => {
    return (
      <DashboardLayout>
        <h1 className="text-2xl font-bold">Modul Pengaduan</h1>
      </DashboardLayout>
    );
  };

  export default Complaints;
  ```

- [ ] **Step 3: Register route in App.tsx**
  Modify `projects/si-digi-rtrw/frontend/src/App.tsx`:
  Import `Complaints`:
  ```typescript
  import Complaints from './pages/admin/Complaints';
  ```
  Add route:
  ```typescript
          <Route path="/admin/announcements" element={<Announcements />} />
          <Route path="/admin/letters" element={<Letters />} />
          <Route path="/admin/complaints" element={<Complaints />} />
          <Route path="/pengumuman" element={<PublicAnnouncements />} />
  ```

- [ ] **Step 4: Run build to verify compilation**
  Run: `npm run build --prefix projects/si-digi-rtrw/frontend`
  Expected: PASS (No compilation errors)

- [ ] **Step 5: Commit changes**
  Run:
  ```bash
  git add projects/si-digi-rtrw/frontend/src/components/DashboardLayout.tsx projects/si-digi-rtrw/frontend/src/pages/admin/Complaints.tsx projects/si-digi-rtrw/frontend/src/App.tsx
  git commit -m "feat(frontend): setup complaints page router and layout navigation links"
  ```

---

### Task 4: Complete Complaints Page UI and Integration

**Files:**
- Modify: `projects/si-digi-rtrw/frontend/src/pages/admin/Complaints.tsx`

- [ ] **Step 1: Replace placeholder page with Complaints tabbed dashboard UI**
  Overwrite `projects/si-digi-rtrw/frontend/src/pages/admin/Complaints.tsx` with the complete implementation code:
  ```typescript
  import React, { useEffect, useState } from 'react';
  import DashboardLayout from '../../components/DashboardLayout';
  import { AlertTriangle, Upload, Eye } from 'lucide-react';
  import api from '../../services/api';
  import { useAuth } from '../../hooks/useAuth';

  type ComplaintStatus = 'Diterima' | 'Diproses' | 'Selesai';

  interface Complaint {
    id: number;
    title: string;
    description: string;
    photo_url: string;
    status: ComplaintStatus;
    rt: string;
    rw: string;
    created_at: string;
    reporter?: {
      id: number;
      username: string;
      resident?: {
        full_name: string;
      };
    };
  }

  const statusBadge = (status: ComplaintStatus) => {
    if (status === 'Selesai') return 'bg-green-100 text-green-700';
    if (status === 'Diproses') return 'bg-purple-100 text-purple-700';
    return 'bg-amber-100 text-amber-700';
  };

  const Complaints: React.FC = () => {
    const { user } = useAuth();
    const [items, setItems] = useState<Complaint[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'tab1' | 'tab2'>('tab1');
    const [actionId, setActionId] = useState<number | null>(null);

    // Form inputs
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [photo, setPhoto] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

    const fetchComplaints = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get('/api/complaints');
        setItems(Array.isArray(data) ? data : []);
      } catch {
        setError('Gagal memuat daftar pengaduan');
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      fetchComplaints();
    }, [user]);

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        setPhoto(file);
        setPreviewUrl(URL.createObjectURL(file));
      }
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!title.trim() || !description.trim() || !photo) {
        alert('Mohon lengkapi formulir laporan dan sertakan foto bukti');
        return;
      }

      setSubmitting(true);
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('photo', photo);

      try {
        await api.post('/api/complaints', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        setTitle('');
        setDescription('');
        setPhoto(null);
        setPreviewUrl('');
        setActiveTab('tab2');
        fetchComplaints();
      } catch (err: any) {
        alert(err.response?.data?.error || 'Gagal mengirim pengaduan');
      } finally {
        setSubmitting(false);
      }
    };

    const updateStatus = async (id: number, nextStatus: ComplaintStatus) => {
      setActionId(id);
      try {
        await api.put(`/api/complaints/${id}/status`, { status: nextStatus });
        fetchComplaints();
      } catch (err: any) {
        alert(err.response?.data?.error || 'Gagal memperbarui status pengaduan');
      } finally {
        setActionId(null);
      }
    };

    const isWarga = user?.role === 'Warga';

    const getFilteredComplaints = () => {
      if (isWarga) {
        return items;
      }
      // Admin RT / RW
      if (activeTab === 'tab1') {
        return items.filter((item) => item.status === 'Diterima' || item.status === 'Diproses');
      } else {
        return items.filter((item) => item.status === 'Selesai');
      }
    };

    const filtered = getFilteredComplaints();

    return (
      <DashboardLayout>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Laporan Pengaduan Warga</h1>
          <p className="text-gray-500 text-sm">
            {isWarga
              ? 'Tulis pengaduan mengenai masalah lingkungan Anda secara transparan'
              : 'Verifikasi dan tindak lanjuti laporan pengaduan dari warga'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 border border-red-100">
            {error}
          </div>
        )}

        {/* Tab Headers */}
        <div className="flex gap-4 border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('tab1')}
            className={`pb-3 font-bold text-sm border-b-2 px-2 transition-colors ${
              activeTab === 'tab1'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {isWarga ? 'Buat Pengaduan' : 'Antrean Pengaduan'}
          </button>
          <button
            onClick={() => setActiveTab('tab2')}
            className={`pb-3 font-bold text-sm border-b-2 px-2 transition-colors ${
              activeTab === 'tab2'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {isWarga ? 'Daftar Pengaduan Lingkungan' : 'Arsip Selesai'}
          </button>
        </div>

        {/* Tab Contents */}
        {isWarga && activeTab === 'tab1' ? (
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm max-w-lg">
            <h2 className="text-lg font-bold text-gray-800 mb-6">Formulir Laporan Baru</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Judul Laporan</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Lampu Jalan Padam di Blok B"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Deskripsi Masalah</label>
                <textarea
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Jelaskan detail lokasi dan kronologi permasalahan..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-blue-500 h-28 resize-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Foto Bukti Fisik (Wajib)</label>
                <div className="mt-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors relative">
                  <input
                    type="file"
                    required
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <p className="text-xs text-gray-500 font-medium">Klik atau tarik foto ke sini untuk memilih file</p>
                  <p className="text-[10px] text-gray-400 mt-1">Hanya JPG, JPEG, PNG (Maks 5MB)</p>
                </div>
                {previewUrl && (
                  <div className="mt-4">
                    <p className="text-xs font-bold text-gray-500 mb-2">Pratinjau Foto:</p>
                    <img src={previewUrl} alt="Preview" className="w-full h-40 object-cover rounded-xl border" />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all text-sm shadow-md"
              >
                {submitting ? 'Mengunggah Laporan...' : 'Kirim Pengaduan'}
              </button>
            </form>
          </div>
        ) : (
          <div>
            {loading ? (
              <div className="p-8 text-center text-gray-500 bg-white rounded-2xl border">Memuat data...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-gray-500 bg-white rounded-2xl border">
                Belum ada laporan pengaduan saat ini.
              </div>
            ) : isWarga ? (
              /* Warga Card Feed Layout */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filtered.map((item) => (
                  <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                    <img
                      src={api.defaults.baseURL + item.photo_url}
                      alt={item.title}
                      className="w-full h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setSelectedPhoto(api.defaults.baseURL + item.photo_url)}
                    />
                    <div className="p-6 flex-1 flex flex-col justify-between gap-4">
                      <div>
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                            {item.title}
                          </h3>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold shrink-0 uppercase ${statusBadge(item.status)}`}>
                            {item.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-3">{item.description}</p>
                      </div>
                      <div className="text-[11px] text-gray-400 border-t pt-3 flex justify-between items-center">
                        <span>Pelapor: {item.reporter?.resident?.full_name || item.reporter?.username} (RT {item.rt})</span>
                        <span>{item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Admin Work Table Layout */
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider font-bold">
                      <th className="px-6 py-4">Laporan</th>
                      <th className="px-6 py-4">Detail</th>
                      <th className="px-6 py-4">Foto Bukti</th>
                      <th className="px-6 py-4">Pelapor & Wilayah</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-800 text-sm">{item.title}</div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : ''}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{item.description}</td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => setSelectedPhoto(api.defaults.baseURL + item.photo_url)}
                            className="flex items-center gap-1.5 px-2.5 py-1 border rounded-lg text-xs font-bold text-blue-600 hover:bg-blue-50"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Lihat Foto
                          </button>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {item.reporter?.resident?.full_name || item.reporter?.username}
                          <div className="text-xs text-gray-400">RT {item.rt} / RW {item.rw}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadge(item.status)}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {item.status === 'Diterima' && (
                              <button
                                onClick={() => updateStatus(item.id, 'Diproses')}
                                disabled={actionId === item.id}
                                className="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 disabled:opacity-50"
                              >
                                Proses
                              </button>
                            )}
                            {(item.status === 'Diterima' || item.status === 'Diproses') && (
                              <button
                                onClick={() => updateStatus(item.id, 'Selesai')}
                                disabled={actionId === item.id}
                                className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-700 disabled:opacity-50"
                              >
                                Selesaikan
                              </button>
                            )}
                            {item.status === 'Selesai' && <span className="text-xs text-gray-400">Terselesaikan</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Photo View Modal */}
        {selectedPhoto && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={() => setSelectedPhoto(null)}>
            <div className="relative max-w-3xl w-full bg-white rounded-2xl overflow-hidden p-2" onClick={(e) => e.stopPropagation()}>
              <img src={selectedPhoto} alt="Zoomed view" className="w-full max-h-[80vh] object-contain rounded-xl" />
              <button
                onClick={() => setSelectedPhoto(null)}
                className="absolute right-4 top-4 bg-black/60 hover:bg-black/80 text-white px-3 py-1 rounded-full text-xs font-bold"
              >
                Tutup [X]
              </button>
            </div>
          </div>
        )}
      </DashboardLayout>
    );
  };

  export default Complaints;
  ```

- [ ] **Step 2: Run frontend build to verify zero compile warnings/errors**
  Run: `npm run build --prefix projects/si-digi-rtrw/frontend`
  Expected: PASS

- [ ] **Step 3: Commit changes**
  Run:
  ```bash
  git add projects/si-digi-rtrw/frontend/src/pages/admin/Complaints.tsx
  git commit -m "feat(frontend): implement visual dashboard feed for Citizen complaints and working tables for Admin review"
  ```
