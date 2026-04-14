#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class CSPMAPITester:
    def __init__(self, base_url="https://aws-misconfig-check.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.scan_results = None
        self.tokens = {}  # Store tokens for different users

    def run_test(self, name, method, endpoint, expected_status=200, data=None, validate_func=None, token=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}" if endpoint else f"{self.api_url}/"
        headers = {'Content-Type': 'application/json'}
        
        # Add authorization header if token provided
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)

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
                    # For file downloads, we expect non-JSON responses
                    if expected_status == 200 and 'export' in endpoint:
                        self.tests_passed += 1
                        print(f"✅ Passed - Status: {response.status_code} (File download)")
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

    def validate_root_response(self, data):
        """Validate root API response"""
        if "message" not in data:
            return "Missing 'message' field"
        if "CSPM" not in data["message"]:
            return "Message doesn't contain 'CSPM'"
        return True

    def validate_regions_response(self, data):
        """Validate regions API response"""
        if "regions" not in data:
            return "Missing 'regions' field"
        regions = data["regions"]
        if not isinstance(regions, list):
            return "Regions is not a list"
        if len(regions) != 18:
            return f"Expected 18 regions, got {len(regions)}"
        expected_regions = ["us-east-1", "us-east-2", "us-west-1", "us-west-2"]
        for region in expected_regions:
            if region not in regions:
                return f"Missing expected region: {region}"
        return True

    def validate_rules_response(self, data):
        """Validate rules API response"""
        if "rules" not in data:
            return "Missing 'rules' field"
        if "total" not in data:
            return "Missing 'total' field"
        rules = data["rules"]
        if not isinstance(rules, list):
            return "Rules is not a list"
        if len(rules) != 27:
            return f"Expected 27 rules, got {len(rules)}"
        if data["total"] != 27:
            return f"Total field should be 27, got {data['total']}"
        
        # Validate rule structure
        required_fields = ["check_id", "title", "service", "default_severity", "cis_reference", "remediation"]
        for rule in rules[:3]:  # Check first 3 rules
            for field in required_fields:
                if field not in rule:
                    return f"Rule missing required field: {field}"
        
        # Check for expected services
        services = set(rule["service"] for rule in rules)
        expected_services = {"IAM", "S3", "EC2", "CloudTrail"}
        if not expected_services.issubset(services):
            return f"Missing expected services. Got: {services}"
        
        return True

    def validate_scan_response(self, data):
        """Validate scan API response"""
        required_fields = [
            "findings", "findings_by_severity", "findings_by_service", 
            "total_findings", "account_id", "scan_time", "demo_mode"
        ]
        for field in required_fields:
            if field not in data:
                return f"Missing required field: {field}"
        
        if not isinstance(data["findings"], list):
            return "Findings is not a list"
        
        if not isinstance(data["findings_by_severity"], dict):
            return "findings_by_severity is not a dict"
        
        if not isinstance(data["findings_by_service"], dict):
            return "findings_by_service is not a dict"
        
        if data["demo_mode"] is not True:
            return "demo_mode should be True"
        
        # Check severity counts
        severity_keys = {"CRITICAL", "HIGH", "MEDIUM", "LOW"}
        for key in severity_keys:
            if key not in data["findings_by_severity"]:
                return f"Missing severity key: {key}"
        
        # Check service counts
        service_keys = {"IAM", "S3", "EC2", "CloudTrail"}
        for key in service_keys:
            if key not in data["findings_by_service"]:
                return f"Missing service key: {key}"
        
        # Validate findings structure
        if data["findings"]:
            finding = data["findings"][0]
            required_finding_fields = [
                "finding_id", "service", "check_id", "title", "description",
                "resource_id", "region", "severity", "risk_score", "remediation", "cis_reference"
            ]
            for field in required_finding_fields:
                if field not in finding:
                    return f"Finding missing required field: {field}"
        
        return True

    def login_user(self, username, password):
        """Login and store token for user"""
        success, data = self.run_test(
            f"Login {username}",
            "POST",
            "auth/login",
            200,
            data={"username": username, "password": password}
        )
        if success and "access_token" in data:
            self.tokens[username] = data["access_token"]
            return True
        return False

    def validate_posture_trend_response(self, data):
        """Validate posture trend API response"""
        if "trend" not in data:
            return "Missing 'trend' field"
        if "total_scans" not in data:
            return "Missing 'total_scans' field"
        
        trend = data["trend"]
        if not isinstance(trend, list):
            return "Trend is not a list"
        
        if not isinstance(data["total_scans"], int):
            return "total_scans is not an integer"
        
        # If trend has data, validate structure
        if trend:
            for item in trend[:2]:  # Check first 2 items
                required_fields = ["avg_risk_score", "total_findings", "findings_by_severity", "timestamp"]
                for field in required_fields:
                    if field not in item:
                        return f"Trend item missing required field: {field}"
        
        return True

    def validate_scheduler_status_response(self, data):
        """Validate scheduler status API response"""
        required_fields = ["enabled", "cron", "region", "scheduler_running"]
        for field in required_fields:
            if field not in data:
                return f"Missing required field: {field}"
        
        if not isinstance(data["enabled"], bool):
            return "enabled is not a boolean"
        
        if not isinstance(data["cron"], str):
            return "cron is not a string"
        
        if not isinstance(data["region"], str):
            return "region is not a string"
        
        return True

    def validate_email_status_response(self, data):
        """Validate email status API response"""
        required_fields = ["configured", "smtp_host", "alert_email"]
        for field in required_fields:
            if field not in data:
                return f"Missing required field: {field}"
        
        if not isinstance(data["configured"], bool):
            return "configured is not a boolean"
        
        return True

    def test_root_api(self):
        """Test GET /api/"""
        return self.run_test(
            "Root API endpoint",
            "GET",
            "",
            200,
            validate_func=self.validate_root_response
        )

    def test_regions_api(self):
        """Test GET /api/regions"""
        return self.run_test(
            "Regions API endpoint",
            "GET",
            "regions",
            200,
            validate_func=self.validate_regions_response
        )

    def test_rules_api(self):
        """Test GET /api/rules"""
        return self.run_test(
            "Rules API endpoint",
            "GET",
            "rules",
            200,
            validate_func=self.validate_rules_response
        )

    def test_posture_trend_api(self):
        """Test GET /api/posture/trend (PUBLIC endpoint)"""
        return self.run_test(
            "Posture Trend API endpoint (PUBLIC)",
            "GET",
            "posture/trend",
            200,
            validate_func=self.validate_posture_trend_response
        )

    def test_scheduler_status_admin(self):
        """Test GET /api/scheduler/status (admin role)"""
        if "admin" not in self.tokens:
            print("❌ Admin token not available")
            return False, {}
        
        return self.run_test(
            "Scheduler Status API (admin)",
            "GET",
            "scheduler/status",
            200,
            token=self.tokens["admin"],
            validate_func=self.validate_scheduler_status_response
        )

    def test_scheduler_status_viewer_403(self):
        """Test GET /api/scheduler/status with viewer role (should get 403)"""
        if "viewer" not in self.tokens:
            print("❌ Viewer token not available")
            return False, {}
        
        return self.run_test(
            "Scheduler Status API (viewer - should be 403)",
            "GET",
            "scheduler/status",
            403,
            token=self.tokens["viewer"]
        )

    def test_scheduler_config_update_admin(self):
        """Test PUT /api/scheduler/config (admin role)"""
        if "admin" not in self.tokens:
            print("❌ Admin token not available")
            return False, {}
        
        config_data = {
            "enabled": False,
            "cron": "0 0 * * *",
            "region": "us-east-1"
        }
        
        return self.run_test(
            "Scheduler Config Update API (admin)",
            "PUT",
            "scheduler/config",
            200,
            data=config_data,
            token=self.tokens["admin"]
        )

    def test_scheduler_run_now_analyst(self):
        """Test POST /api/scheduler/run-now (analyst role)"""
        if "analyst" not in self.tokens:
            print("❌ Analyst token not available")
            return False, {}
        
        return self.run_test(
            "Scheduler Run Now API (analyst)",
            "POST",
            "scheduler/run-now",
            200,
            token=self.tokens["analyst"]
        )

    def test_scheduler_run_now_viewer_403(self):
        """Test POST /api/scheduler/run-now with viewer role (should get 403)"""
        if "viewer" not in self.tokens:
            print("❌ Viewer token not available")
            return False, {}
        
        return self.run_test(
            "Scheduler Run Now API (viewer - should be 403)",
            "POST",
            "scheduler/run-now",
            403,
            token=self.tokens["viewer"]
        )

    def test_email_status_admin(self):
        """Test GET /api/notifications/email-status (admin role)"""
        if "admin" not in self.tokens:
            print("❌ Admin token not available")
            return False, {}
        
        return self.run_test(
            "Email Status API (admin)",
            "GET",
            "notifications/email-status",
            200,
            token=self.tokens["admin"],
            validate_func=self.validate_email_status_response
        )
        """Test GET /api/"""
        return self.run_test(
            "Root API endpoint",
            "GET",
            "",
            200,
            validate_func=self.validate_root_response
        )

    def test_regions_api(self):
        """Test GET /api/regions"""
        return self.run_test(
            "Regions API endpoint",
            "GET",
            "regions",
            200,
            validate_func=self.validate_regions_response
        )

    def test_rules_api(self):
        """Test GET /api/rules"""
        return self.run_test(
            "Rules API endpoint",
            "GET",
            "rules",
            200,
            validate_func=self.validate_rules_response
        )

    def test_scan_api(self):
        """Test POST /api/scan"""
        if "analyst" not in self.tokens:
            print("❌ Analyst token not available")
            return False, {}
            
        success, data = self.run_test(
            "Scan API endpoint",
            "POST",
            "scan",
            200,
            data={"region": "us-east-1"},
            token=self.tokens["analyst"],
            validate_func=self.validate_scan_response
        )
        if success:
            self.scan_results = data
        return success, data

    def test_scan_results_api(self):
        """Test GET /api/scan/results"""
        if "viewer" not in self.tokens:
            print("❌ Viewer token not available")
            return False, {}
            
        return self.run_test(
            "Scan Results API endpoint",
            "GET",
            "scan/results",
            200,
            token=self.tokens["viewer"],
            validate_func=self.validate_scan_response
        )

    def test_export_json_api(self):
        """Test GET /api/scan/export/json"""
        if "analyst" not in self.tokens:
            print("❌ Analyst token not available")
            return False, {}
            
        return self.run_test(
            "Export JSON API endpoint",
            "GET",
            "scan/export/json",
            200,
            token=self.tokens["analyst"]
        )

    def test_export_csv_api(self):
        """Test GET /api/scan/export/csv"""
        if "analyst" not in self.tokens:
            print("❌ Analyst token not available")
            return False, {}
            
        return self.run_test(
            "Export CSV API endpoint",
            "GET",
            "scan/export/csv",
            200,
            token=self.tokens["analyst"]
        )

def main():
    print("🚀 Starting CSPM API Testing")
    print("=" * 50)
    
    tester = CSPMAPITester()
    
    # First, login all users to get tokens
    print("\n🔐 Logging in test users...")
    credentials = [
        ("admin", "Admin@123"),
        ("analyst", "Analyst@123"),
        ("viewer", "Viewer@123")
    ]
    
    for username, password in credentials:
        if not tester.login_user(username, password):
            print(f"❌ Failed to login {username}")
    
    # Test all endpoints in order
    test_methods = [
        # Original tests
        tester.test_root_api,
        tester.test_regions_api,
        tester.test_rules_api,
        
        # New feature tests
        tester.test_posture_trend_api,  # PUBLIC endpoint
        tester.test_scheduler_status_admin,  # Admin only
        tester.test_scheduler_status_viewer_403,  # Should fail with 403
        tester.test_scheduler_config_update_admin,  # Admin only
        tester.test_scheduler_run_now_analyst,  # Analyst role
        tester.test_scheduler_run_now_viewer_403,  # Should fail with 403
        tester.test_email_status_admin,  # Admin only
        
        # Original scan tests (require auth)
        tester.test_scan_api,
        tester.test_scan_results_api,
        tester.test_export_json_api,
        tester.test_export_csv_api,
    ]
    
    for test_method in test_methods:
        try:
            test_method()
        except Exception as e:
            print(f"❌ Test failed with exception: {str(e)}")
            tester.tests_run += 1
    
    # Print summary
    print("\n" + "=" * 50)
    print(f"📊 Test Summary: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.scan_results:
        print(f"📈 Scan Results Summary:")
        print(f"   Total Findings: {tester.scan_results.get('total_findings', 'N/A')}")
        print(f"   Account ID: {tester.scan_results.get('account_id', 'N/A')}")
        print(f"   Region: {tester.scan_results.get('region', 'N/A')}")
        print(f"   Scan Time: {tester.scan_results.get('scan_time', 'N/A')}s")
        print(f"   Demo Mode: {tester.scan_results.get('demo_mode', 'N/A')}")
    
    success_rate = (tester.tests_passed / tester.tests_run) * 100 if tester.tests_run > 0 else 0
    print(f"✅ Success Rate: {success_rate:.1f}%")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())