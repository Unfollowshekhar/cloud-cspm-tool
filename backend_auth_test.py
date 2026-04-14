#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class CSPMAuthTester:
    def __init__(self, base_url="https://aws-misconfig-check.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.tokens = {}  # Store tokens for different roles
        
        # Test credentials
        self.credentials = {
            "admin": {"username": "admin", "password": "Admin@123"},
            "analyst": {"username": "analyst", "password": "Analyst@123"},
            "viewer": {"username": "viewer", "password": "Viewer@123"}
        }

    def run_test(self, name, method, endpoint, expected_status=200, data=None, headers=None, validate_func=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}" if endpoint else f"{self.api_url}/"
        default_headers = {'Content-Type': 'application/json'}
        if headers:
            default_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        if headers and 'Authorization' in headers:
            print(f"   Auth: Bearer token provided")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=default_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=default_headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                try:
                    response_data = response.json()
                    if validate_func:
                        validation_result = validate_func(response_data)
                        if validation_result is True:
                            self.tests_passed += 1
                            print(f"✅ Passed - Status: {response.status_code}, Validation: OK")
                        else:
                            print(f"❌ Failed - Status: {response.status_code}, Validation: {validation_result}")
                            success = False
                    else:
                        self.tests_passed += 1
                        print(f"✅ Passed - Status: {response.status_code}")
                    return success, response_data
                except json.JSONDecodeError:
                    if expected_status == 200:
                        self.tests_passed += 1
                        print(f"✅ Passed - Status: {response.status_code} (Non-JSON response)")
                        return True, response.content
                    else:
                        print(f"❌ Failed - Invalid JSON response")
                        return False, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_login_success(self, role):
        """Test successful login for a role"""
        creds = self.credentials[role]
        
        def validate_login_response(data):
            required_fields = ["access_token", "username", "role"]
            for field in required_fields:
                if field not in data:
                    return f"Missing required field: {field}"
            if data["username"] != creds["username"]:
                return f"Username mismatch: expected {creds['username']}, got {data['username']}"
            if data["role"] != role:
                return f"Role mismatch: expected {role}, got {data['role']}"
            return True
        
        success, data = self.run_test(
            f"Login as {role}",
            "POST",
            "auth/login",
            200,
            data=creds,
            validate_func=validate_login_response
        )
        
        if success:
            self.tokens[role] = data["access_token"]
            print(f"   Stored token for {role}")
        
        return success, data

    def test_login_failure(self):
        """Test login with wrong password"""
        return self.run_test(
            "Login with wrong password",
            "POST",
            "auth/login",
            401,
            data={"username": "admin", "password": "WrongPassword123"}
        )

    def test_protected_endpoint_no_token(self):
        """Test protected endpoint without token"""
        return self.run_test(
            "Protected endpoint without token",
            "GET",
            "scan/results",
            401
        )

    def test_scan_with_role(self, role, should_succeed=True):
        """Test scan endpoint with specific role"""
        if role not in self.tokens:
            print(f"❌ No token available for role: {role}")
            return False, {}
        
        headers = {"Authorization": f"Bearer {self.tokens[role]}"}
        expected_status = 200 if should_succeed else 403
        
        return self.run_test(
            f"POST /api/scan with {role} role",
            "POST",
            "scan",
            expected_status,
            data={"region": "us-east-1"},
            headers=headers
        )

    def test_scan_results_with_role(self, role):
        """Test scan results endpoint with specific role"""
        if role not in self.tokens:
            print(f"❌ No token available for role: {role}")
            return False, {}
        
        headers = {"Authorization": f"Bearer {self.tokens[role]}"}
        
        def validate_scan_results(data):
            if "error" in data and "No scan results available" in data["error"]:
                return True  # This is acceptable if no scan has been run
            required_fields = ["findings", "total_findings", "account_id"]
            for field in required_fields:
                if field not in data:
                    return f"Missing required field: {field}"
            return True
        
        return self.run_test(
            f"GET /api/scan/results with {role} role",
            "GET",
            "scan/results",
            200,
            headers=headers,
            validate_func=validate_scan_results
        )

    def test_attack_mappings(self, role):
        """Test ATT&CK mappings endpoint"""
        if role not in self.tokens:
            print(f"❌ No token available for role: {role}")
            return False, {}
        
        headers = {"Authorization": f"Bearer {self.tokens[role]}"}
        
        def validate_attack_mappings(data):
            if "combined_paths" not in data:
                return "Missing 'combined_paths' field"
            if "mappings" not in data:
                return "Missing 'mappings' field"
            if "total" not in data:
                return "Missing 'total' field"
            return True
        
        return self.run_test(
            f"GET /api/attack/mappings with {role} role",
            "GET",
            "attack/mappings",
            200,
            headers=headers,
            validate_func=validate_attack_mappings
        )

    def test_threat_live(self, role):
        """Test live threat data endpoint"""
        if role not in self.tokens:
            print(f"❌ No token available for role: {role}")
            return False, {}
        
        headers = {"Authorization": f"Bearer {self.tokens[role]}"}
        
        def validate_threat_live(data):
            if "events" not in data:
                return "Missing 'events' field"
            if not isinstance(data["events"], list):
                return "Events should be a list"
            return True
        
        return self.run_test(
            f"GET /api/threat/live with {role} role",
            "GET",
            "threat/live",
            200,
            headers=headers,
            validate_func=validate_threat_live
        )

    def test_threat_stats(self, role):
        """Test threat statistics endpoint"""
        if role not in self.tokens:
            print(f"❌ No token available for role: {role}")
            return False, {}
        
        headers = {"Authorization": f"Bearer {self.tokens[role]}"}
        
        def validate_threat_stats(data):
            if "top_attacking_countries" not in data:
                return "Missing 'top_attacking_countries' field"
            if "threats_by_type" not in data:
                return "Missing 'threats_by_type' field"
            return True
        
        return self.run_test(
            f"GET /api/threat/stats with {role} role",
            "GET",
            "threat/stats",
            200,
            headers=headers,
            validate_func=validate_threat_stats
        )

    def test_scan_history(self, role):
        """Test scan history endpoint"""
        if role not in self.tokens:
            print(f"❌ No token available for role: {role}")
            return False, {}
        
        headers = {"Authorization": f"Bearer {self.tokens[role]}"}
        
        def validate_scan_history(data):
            if "history" not in data:
                return "Missing 'history' field"
            if not isinstance(data["history"], list):
                return "History should be a list"
            return True
        
        return self.run_test(
            f"GET /api/scan/history with {role} role",
            "GET",
            "scan/history",
            200,
            headers=headers,
            validate_func=validate_scan_history
        )

    def test_notifications(self, role):
        """Test notifications endpoint"""
        if role not in self.tokens:
            print(f"❌ No token available for role: {role}")
            return False, {}
        
        headers = {"Authorization": f"Bearer {self.tokens[role]}"}
        
        def validate_notifications(data):
            if "notifications" not in data:
                return "Missing 'notifications' field"
            if not isinstance(data["notifications"], list):
                return "Notifications should be a list"
            return True
        
        return self.run_test(
            f"GET /api/notifications with {role} role",
            "GET",
            "notifications",
            200,
            headers=headers,
            validate_func=validate_notifications
        )

    def test_remediation_update(self, role):
        """Test remediation update endpoint"""
        if role not in self.tokens:
            print(f"❌ No token available for role: {role}")
            return False, {}
        
        headers = {"Authorization": f"Bearer {self.tokens[role]}"}
        
        # Use a test finding ID
        test_finding_id = "test-finding-123"
        
        return self.run_test(
            f"PUT /api/remediation/{test_finding_id} with {role} role",
            "PUT",
            f"remediation/{test_finding_id}",
            200,
            data={"status": "in_progress", "notes": "Test remediation update"},
            headers=headers
        )

def main():
    print("🚀 Starting CSPM Authentication & Authorization Testing")
    print("=" * 60)
    
    tester = CSPMAuthTester()
    
    # Test 1: Login tests
    print("\n📝 Testing Authentication")
    print("-" * 30)
    
    # Test successful logins for all roles
    for role in ["admin", "analyst", "viewer"]:
        tester.test_login_success(role)
    
    # Test failed login
    tester.test_login_failure()
    
    # Test protected endpoint without token
    tester.test_protected_endpoint_no_token()
    
    # Test 2: Role-based access control
    print("\n🔐 Testing Role-Based Access Control")
    print("-" * 40)
    
    # Test scan endpoint (requires analyst+ role)
    tester.test_scan_with_role("admin", should_succeed=True)
    tester.test_scan_with_role("analyst", should_succeed=True)
    tester.test_scan_with_role("viewer", should_succeed=False)
    
    # Test scan results (works with any authenticated role)
    for role in ["admin", "analyst", "viewer"]:
        tester.test_scan_results_with_role(role)
    
    # Test 3: Additional endpoints
    print("\n🌐 Testing Additional Endpoints")
    print("-" * 35)
    
    # Test with admin role for all endpoints
    role = "admin"
    tester.test_attack_mappings(role)
    tester.test_threat_live(role)
    tester.test_threat_stats(role)
    tester.test_scan_history(role)
    tester.test_notifications(role)
    tester.test_remediation_update(role)
    
    # Print summary
    print("\n" + "=" * 60)
    print(f"📊 Test Summary: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    success_rate = (tester.tests_passed / tester.tests_run) * 100 if tester.tests_run > 0 else 0
    print(f"✅ Success Rate: {success_rate:.1f}%")
    
    # Print token summary
    print(f"\n🔑 Tokens obtained for roles: {list(tester.tokens.keys())}")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())