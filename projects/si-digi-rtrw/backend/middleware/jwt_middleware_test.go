package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"si-digi-rtrw-backend/middleware"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func TestAuthMiddlewareExtractsRTRW(t *testing.T) {
	os.Setenv("JWT_SECRET", "mytestsecret")
	gin.SetMode(gin.TestMode)

	r := gin.New()
	r.Use(middleware.AuthMiddleware())
	r.GET("/test-claims", func(c *gin.Context) {
		userID, _ := c.Get("user_id")
		role, _ := c.Get("role")
		rt, _ := c.Get("rt")
		rw, _ := c.Get("rw")
		c.JSON(http.StatusOK, gin.H{
			"user_id": userID,
			"role":    role,
			"rt":      rt,
			"rw":      rw,
		})
	})

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": float64(10),
		"role":    "Admin RT",
		"rt":      "02",
		"rw":      "04",
		"exp":     time.Now().Add(time.Hour).Unix(),
	})
	tokenString, _ := token.SignedString([]byte("mytestsecret"))

	req, _ := http.NewRequest("GET", "/test-claims", nil)
	req.Header.Set("Authorization", "Bearer "+tokenString)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("Expected status 200, got %d", w.Code)
	}

	// Verify context values were set
	if w.Body.String() != `{"role":"Admin RT","rt":"02","rw":"04","user_id":10}` {
		t.Errorf("Unexpected body claims: %s", w.Body.String())
	}
}
