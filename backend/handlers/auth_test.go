package handlers

import (
	"testing"
)

func TestGetPhoneVariations(t *testing.T) {
	tests := []struct {
		input       string
		expectedHas string
	}{
		{"0911223344", "+251911223344"},
		{"+251911223344", "0911223344"},
		{"911223344", "+251911223344"},
		{"0911 22 33 44", "+251911223344"},
	}

	for _, tc := range tests {
		vars := getPhoneVariations(tc.input)
		found := false
		for _, v := range vars {
			if v == tc.expectedHas {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("For input %q, expected variations to contain %q, but got %v", tc.input, tc.expectedHas, vars)
		}
	}
}
