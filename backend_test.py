#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class FixifyAPITester:
    def __init__(self, base_url="https://civic-report-18.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.moderator_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
        
        if self.token and not headers:
            test_headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}, Expected: {expected_status}"
            
            if not success:
                try:
                    error_detail = response.json()
                    details += f", Response: {error_detail}"
                except:
                    details += f", Response: {response.text[:200]}"

            self.log_test(name, success, details)
            return success, response.json() if success and response.content else {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, response = self.run_test(
            "Root API Endpoint",
            "GET",
            "",
            200
        )
        return success

    def test_seed_moderator(self):
        """Create moderator account"""
        success, response = self.run_test(
            "Seed Moderator Account",
            "POST",
            "seed/moderator",
            200
        )
        return success

    def test_user_registration(self):
        """Test user registration"""
        test_user_data = {
            "email": f"testuser_{datetime.now().strftime('%H%M%S')}@fixify.com",
            "password": "TestPass123!",
            "full_name": "Test User"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=test_user_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            return True
        return False

    def test_moderator_login(self):
        """Test moderator login"""
        moderator_data = {
            "email": "moderator@fixify.com",
            "password": "Moderator123!"
        }
        
        success, response = self.run_test(
            "Moderator Login",
            "POST",
            "auth/login",
            200,
            data=moderator_data
        )
        
        if success and 'token' in response:
            self.moderator_token = response['token']
            return True
        return False

    def test_user_login(self):
        """Test user login with test credentials"""
        login_data = {
            "email": "testuser@fixify.com",
            "password": "TestPass123!"
        }
        
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            return True
        return False

    def test_auth_me(self):
        """Test get current user"""
        if not self.token:
            self.log_test("Get Current User", False, "No token available")
            return False
            
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_create_report(self):
        """Test creating a report"""
        if not self.token:
            self.log_test("Create Report", False, "No token available")
            return False
            
        report_data = {
            "title": "Test Pothole Report",
            "description": "Large pothole causing traffic issues",
            "latitude": 27.7172,
            "longitude": 85.3240,
            "location_name": "Kathmandu, Nepal"
        }
        
        success, response = self.run_test(
            "Create Report",
            "POST",
            "reports",
            200,
            data=report_data
        )
        
        if success:
            self.report_id = response.get('id')
        return success

    def test_get_reports(self):
        """Test getting reports"""
        success, response = self.run_test(
            "Get Reports",
            "GET",
            "reports",
            200
        )
        return success

    def test_dashboard_stats(self):
        """Test dashboard stats"""
        success, response = self.run_test(
            "Dashboard Stats",
            "GET",
            "dashboard/stats",
            200
        )
        return success

    def test_get_events(self):
        """Test getting events"""
        success, response = self.run_test(
            "Get Events",
            "GET",
            "events",
            200
        )
        return success

    def test_fixi_chat(self):
        """Test Fixi chatbot"""
        if not self.token:
            self.log_test("Fixi Chat", False, "No token available")
            return False
            
        chat_data = {
            "message": "Hello Fixi, how can I report an issue?"
        }
        
        success, response = self.run_test(
            "Fixi Chat",
            "POST",
            "chat",
            200,
            data=chat_data
        )
        return success

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Fixify API Tests...")
        print(f"📍 Testing against: {self.base_url}")
        print("=" * 60)

        # Test basic endpoints
        self.test_root_endpoint()
        self.test_seed_moderator()
        
        # Test authentication
        self.test_user_registration()
        self.test_moderator_login()
        self.test_auth_me()
        
        # Test core functionality
        self.test_create_report()
        self.test_get_reports()
        self.test_dashboard_stats()
        self.test_get_events()
        self.test_fixi_chat()

        # Print summary
        print("=" * 60)
        print(f"📊 Tests completed: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("⚠️  Some tests failed")
            return 1

def main():
    tester = FixifyAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())