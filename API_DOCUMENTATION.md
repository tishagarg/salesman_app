# Field Sales Management API Documentation

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Base URL](#base-url)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Authentication APIs](#authentication-apis)
- [User Management APIs](#user-management-apis)
- [Lead/Customer Management APIs](#leadcustomer-management-apis)
- [Visit Management APIs](#visit-management-apis)
- [Contract Management APIs](#contract-management-apis)
- [Territory Management APIs](#territory-management-apis)
- [Dashboard APIs](#dashboard-apis)
- [Admin Management APIs](#admin-management-apis)
- [Map & Route APIs](#map--route-apis)
- [Messaging APIs](#messaging-apis)
- [Regional Data APIs](#regional-data-apis)

## Overview

The Field Sales Management API is a RESTful API built with Node.js, TypeScript, and Express.js. It provides comprehensive functionality for managing field sales operations including lead management, visit planning, route optimization, territory management, and contract handling.

## Authentication

The API uses JWT (JSON Web Token) based authentication. Most endpoints require a valid JWT token in the Authorization header.

### Authorization Header Format

```
Authorization: Bearer <your-jwt-token>
```

### Token Types

- **Access Token**: Used for API authentication (expires in 2 days)
- **Refresh Token**: Used to obtain new access tokens (expires in 7 days)

## Base URL

```
Production: https://your-domain.com/api
Development: http://localhost:3002/api
```

## Response Format

All API responses follow a consistent JSON structure:

### Success Response

```json
{
  "success": true,
  "status": 200,
  "message": "Operation successful",
  "data": {
    // Response data here
  },
  "meta": {
    // Optional metadata (pagination, etc.)
  }
}
```

### Error Response

```json
{
  "success": false,
  "status": 400,
  "message": "Error message",
  "error": {
    "code": "ERROR_CODE",
    "details": "Detailed error description"
  }
}
```

## Error Handling

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `500` - Internal Server Error

---

# Authentication APIs

Base path: `/api/auth`

## Register User

Register a new user account.

**Endpoint:** `POST /api/auth/register`

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "first_name": "John",
  "last_name": "Doe",
  "phone_no": "+1234567890",
  "org_name": "Company Name"
}
```

**Response:**

```json
{
  "success": true,
  "status": 201,
  "message": "User created, OTP sent successfully!!",
  "data": {
    "token": "jwt_access_token",
    "refreshToken": "jwt_refresh_token",
    "user": {
      "user_id": 123,
      "email": "user@example.com",
      "full_name": "John Doe",
      "is_admin": 1,
      "is_email_verified": 0
    },
    "organization": {
      "org_id": 456,
      "org_name": "Company Name"
    }
  }
}
```

## Login

Authenticate user and get access token.

**Endpoint:** `POST /api/auth/login`

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**

```json
{
  "success": true,
  "status": 200,
  "message": "Login successful",
  "data": {
    "token": "jwt_access_token",
    "refreshToken": "jwt_refresh_token",
    "user": {
      "user_id": 123,
      "email": "user@example.com",
      "full_name": "John Doe",
      "is_admin": 1,
      "is_email_verified": 1
    },
    "organization": {
      "org_id": 456,
      "org_name": "Company Name"
    }
  }
}
```

## Google OAuth Login

Authenticate using Google OAuth.

**Endpoint:** `POST /api/auth/google`

**Request Body:**

```json
{
  "idToken": "google_id_token"
}
```

## Verify OTP

Verify email verification OTP.

**Endpoint:** `POST /api/auth/verify-otp`
**Authorization:** Required

**Request Body:**

```json
{
  "otp": "123456"
}
```

## Resend OTP

Resend email verification OTP.

**Endpoint:** `POST /api/auth/resend-otp`
**Authorization:** Required

## Forgot Password

Request password reset link.

**Endpoint:** `POST /api/auth/forget-password`

**Request Body:**

```json
{
  "email": "user@example.com"
}
```

## Reset Password

Reset password using token or old password.

**Endpoint:** `POST /api/auth/reset-password`

**Request Body (with token):**

```json
{
  "token": "reset_token",
  "newPassword": "newSecurePassword123"
}
```

**Request Body (change password):**

```json
{
  "oldPassword": "currentPassword",
  "newPassword": "newSecurePassword123"
}
```

## Change Password

Change password for authenticated user.

**Endpoint:** `POST /api/auth/change-password`
**Authorization:** Required

**Request Body:**

```json
{
  "oldPassword": "currentPassword",
  "newPassword": "newSecurePassword123"
}
```

## Logout

Logout and invalidate tokens.

**Endpoint:** `POST /api/auth/logout`
**Authorization:** Required

---

# User Management APIs

Base path: `/api/user`

## Get Lead Status Options

Get available lead status options.

**Endpoint:** `GET /api/user/lead-status`

**Response:**

```json
{
  "success": true,
  "data": [
    "Prospect",
    "Hot_Lead",
    "Meeting",
    "Get_Back",
    "Start_Signing",
    "Signed",
    "Not_Interested",
    "Not_Available"
  ]
}
```

## Get Sales Representatives

Get list of sales representatives.

**Endpoint:** `GET /api/user/sales-rep`
**Authorization:** Required

## Get Unassigned Sales Reps

Get sales reps not assigned to any manager.

**Endpoint:** `GET /api/user/unassigned-sales-rep`
**Authorization:** Required

## Add Team Member

Add a new team member.

**Endpoint:** `POST /api/user`
**Authorization:** Required

**Request Body:**

```json
{
  "email": "member@example.com",
  "first_name": "Jane",
  "last_name": "Smith",
  "phone": "+1234567890",
  "role_id": 2
}
```

## Get All Team Members

Get list of team members.

**Endpoint:** `GET /api/user`
**Authorization:** Required

**Query Parameters:**

- `page` (optional): Page number for pagination
- `limit` (optional): Number of items per page
- `search` (optional): Search term

## Get All Managers

Get list of managers.

**Endpoint:** `GET /api/user/manager`
**Authorization:** Required

## Manager Dashboard
Get dashboard data specific to a manager, including their assigned sales representatives and performance metrics.

**Endpoint:** `GET /api/user/manager/dashboard`
**Authorization:** Required
**User Role:** Manager

**Response:**
```json
{
  "status": 200,
  "message": "Manager dashboard data fetched successfully",
  "data": {
    "salesRepsCount": 5,
    "totalLeads": 150,
    "visitedLeads": 120,
    "unVisitedLeads": 30,
    "signedLeads": 45,
    "unSignedLeads": 105,
    "pendingVisits": 25,
    "completedVisits": 95,
    "totalContracts": 40,
    "salesRepDetails": [
      {
        "user_id": 117,
        "first_name": "John",
        "last_name": "Doe",
        "email": "john.doe@company.com",
        "phone": "+1234567890",
        "is_active": true,
        "total_leads": "25",
        "signed_leads": "8",
        "total_visits": "20",
        "completed_visits": "15",
        "total_contracts": "7"
      },
      {
        "user_id": 118,
        "first_name": "Jane",
        "last_name": "Smith",
        "email": "jane.smith@company.com",
        "phone": "+1234567891",
        "is_active": true,
        "total_leads": "30",
        "signed_leads": "12",
        "total_visits": "25",
        "completed_visits": "20",
        "total_contracts": "10"
      }
    ]
  }
}
```

**Data Description:**
- `salesRepsCount`: Number of sales representatives assigned to this manager
- `totalLeads`: Total leads assigned to manager's sales reps
- `visitedLeads`: Leads that have been visited (not in Prospect or Start_Signing status)
- `unVisitedLeads`: Leads not yet visited (Prospect or Start_Signing status)
- `signedLeads`: Leads with Signed status
- `unSignedLeads`: Leads not yet signed
- `pendingVisits`: Visits not yet completed (no check_out_time)
- `completedVisits`: Visits that have been completed
- `totalContracts`: Total contracts signed by manager's sales reps
- `salesRepDetails`: Individual performance metrics for each sales rep under this manager

## Remove Manager Assignment
Remove manager assignment from a sales representative.

**Endpoint:** `DELETE /api/user/assign-manager/:id`
**Authorization:** Required

**URL Parameters:**
- `id`: Sales representative user ID

**Response:**
```json
{
  "status": 200,
  "message": "Manager assignment removed successfully",
  "data": null
}
```

## Get Team Member by ID

Get specific team member details.

**Endpoint:** `GET /api/user/:id`
**Authorization:** Required

## Assign Manager to Sales Rep

Assign a manager to sales representatives.

**Endpoint:** `POST /api/user/assign-manager`
**Authorization:** Required

**Request Body:**

```json
{
  "managerId": 123,
  "salesRepIds": [456, 789]
}
```

## Edit Team Member

Update team member information.

**Endpoint:** `PATCH /api/user/:id`
**Authorization:** Required

**Request Body:**

```json
{
  "first_name": "Updated Name",
  "last_name": "Updated Surname",
  "phone": "+1234567890",
  "role_id": 2
}
```

## Activate/Deactivate User

Change user active status.

**Endpoint:** `POST /api/user/status`
**Authorization:** Required

**Request Body:**

```json
{
  "user_id": 123,
  "is_active": true
}
```

## Update Profile

Update user profile information.

**Endpoint:** `POST /api/user/update-profile`
**Authorization:** Required

**Request Body:**

```json
{
  "first_name": "Updated Name",
  "last_name": "Updated Surname",
  "phone": "+1234567890"
}
```

---

# Lead/Customer Management APIs

Base path: `/api/leads`

## Import Leads

Bulk import leads from file.

**Endpoint:** `POST /api/leads/import`
**Authorization:** Required

**Request Body:** Multipart form data with CSV file

## Assign Lead

Assign lead to a sales representative.

**Endpoint:** `POST /api/leads/:id/assign`
**Authorization:** Required

**Request Body:**

```json
{
  "sales_rep_id": 123
}
```

## Create Lead

Create a new lead.

**Endpoint:** `POST /api/leads`
**Authorization:** Required

**Request Body:**

```json
{
  "name": "John Customer",
  "email": "customer@example.com",
  "phone": "+1234567890",
  "company": "Customer Company",
  "address": {
    "street_address": "123 Main St",
    "city": "New York",
    "state": "NY",
    "postal_code": "10001",
    "country": "USA"
  },
  "notes": "Potential high-value customer"
}
```

## Update Lead

Update existing lead information.

**Endpoint:** `PATCH /api/leads/:id`
**Authorization:** Required

**Request Body:**

```json
{
  "name": "Updated Name",
  "email": "updated@example.com",
  "phone": "+1234567890",
  "company": "Updated Company",
  "notes": "Updated notes"
}
```

## Update Lead Status

Update lead status.

**Endpoint:** `POST /api/leads/:id/status`
**Authorization:** Required

**Request Body:**

```json
{
  "status": "Hot_Lead"
}
```

## Delete Lead

Delete a lead.

**Endpoint:** `DELETE /api/leads/:id`
**Authorization:** Required

## Bulk Delete Leads

Delete multiple leads.

**Endpoint:** `POST /api/leads/bulk-delete`
**Authorization:** Required

**Request Body:**

```json
{
  "lead_ids": [123, 456, 789]
}
```

## Get Lead by ID

Get specific lead details.

**Endpoint:** `GET /api/leads/:id`
**Authorization:** Required

**Response:**

```json
{
  "success": true,
  "data": {
    "lead_id": 123,
    "name": "John Customer",
    "email": "customer@example.com",
    "phone": "+1234567890",
    "company": "Customer Company",
    "status": "Prospect",
    "address": {
      "street_address": "123 Main St",
      "city": "New York",
      "state": "NY",
      "postal_code": "10001",
      "country": "USA",
      "latitude": 40.7128,
      "longitude": -74.006
    },
    "assigned_to": {
      "user_id": 456,
      "full_name": "Sales Rep Name"
    },
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

## Get All Leads

Get list of leads with filtering and pagination.

**Endpoint:** `GET /api/leads`
**Authorization:** Required

**Query Parameters:**

- `page` (optional): Page number
- `limit` (optional): Items per page
- `status` (optional): Filter by status
- `search` (optional): Search term
- `assigned_to` (optional): Filter by assigned sales rep
- `territory` (optional): Filter by territory

**Response:**

```json
{
  "success": true,
  "data": {
    "leads": [
      {
        "lead_id": 123,
        "name": "John Customer",
        "email": "customer@example.com",
        "status": "Prospect",
        "company": "Customer Company",
        "assigned_to": {
          "user_id": 456,
          "full_name": "Sales Rep Name"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10
    }
  }
}
```

## Bulk Assign Leads

Assign multiple leads to sales representatives.

**Endpoint:** `POST /api/leads/bulk-assign`
**Authorization:** Required

**Request Body:**

```json
{
  "assignments": [
    {
      "lead_id": 123,
      "sales_rep_id": 456
    },
    {
      "lead_id": 124,
      "sales_rep_id": 457
    }
  ]
}
```

---

# Visit Management APIs

Base path: `/api/visit`

## Plan Visit

Plan visits for specific leads.

**Endpoint:** `POST /api/visit/plan`
**Authorization:** Required

**Request Body:**

```json
{
  "lead_ids": [1403],
  "latitude": 61.9298612,
  "longitude": 23.0588836
}
```

**Response:**

```json
{
    "success": true,
    "data": {
        "visits": [
            {
                "lead_id": 1403,
                "rep_id": 127,
                "check_in_time": "2025-09-07T04:43:35.000Z",
                "latitude": 61.44975539999999,
                "longitude": 23.8697993,
                "created_by": "system",
                "is_active": true,
                "check_out_time": null,
                "notes": null,
                "photo_urls": null,
                "next_visit_date": null,
                "action_required": null,
                "updated_by": null,
                "status": null,
                "visit_id": 544,
                "created_at": "2025-09-07T00:15:11.890Z",
                "updated_at": "2025-09-07T00:15:11.890Z"
            }
        ],
        "route": {
            "rep_id": 127,
            "route_date": "2025-09-06T18:30:00.000Z",
            "route_order": [
                {
                    "lead_id": 1403,
                    "visit_id": 544,
                    "latitude": 61.44975539999999,
                    "longitude": 23.8697993,
                    "lead_status": "Start Signing",
                    "distance": 93.52,
                    "eta": "10:13 AM"
                }
            ],
            "created_by": "system",
            "updated_by": null,
            "route_id": 295,
            "is_active": true,
            "created_at": "2025-09-07T05:45:11.890Z",
            "updated_at": "2025-09-07T05:45:11.890Z"
        }
    },
    "message": "Visits planned successfully"
}
```

## Get Planned Visits

Get planned visits for a specific date (efficient endpoint without route optimization).

**Endpoint:** `GET /api/visit/planned`
**Authorization:** Required

**Query Parameters:**

- `date` (optional): Date in YYYY-MM-DD format (defaults to today)

**Response:**

```json
{
  "success": true,
  "message": "Planned visits retrieved successfully",
  "data": [
    {
      "visit_id": 789,
      "lead_id": 123,
      "name": "John Customer",
      "contact_name": "John Customer",
      "phone": "+1234567890",
      "email": "customer@example.com",
      "address": {
        "street_address": "123 Main St",
        "city": "Helsinki",
        "state": "Uusimaa",
        "postal_code": "00100",
        "latitude": 60.1699,
        "longitude": 24.9384,
        "formatted_address": "123 Main St, Helsinki, Uusimaa 00100"
      },
      "scheduled_time": "2024-01-15T09:00:00.000Z",
      "status": "Pending",
      "notes": null,
      "lead_status": "Hot_Lead",
      "is_completed": false,
      "contract": null,
      "photos": []
    }
  ]
}
```

## Log Visit

Log a completed visit.

**Endpoint:** `POST /api/visit/log`
**Authorization:** Required

**Request Body:** Multipart form data

- `lead_id`: Lead ID
- `latitude`: Visit location latitude
- `longitude`: Visit location longitude
- `notes`: Visit notes
- `followUps`: JSON string of follow-up items
- `status`: Visit status
- `contract_id`: Associated contract ID (optional)
- `visit_id`: Visit ID if updating existing
- `photos`: Array of photo files (optional)

**Response:**

```json
{
  "success": true,
  "message": "Visit logged successfully",
  "data": {
    "visit_id": 789,
    "lead_id": 123,
    "status": "Completed",
    "notes": "Great meeting, customer interested",
    "photos": ["photo1_url", "photo2_url"],
    "followUps": [
      {
        "task": "Send proposal",
        "scheduled_date": "2024-02-01T10:00:00.000Z"
      }
    ]
  }
}
```

## Get Past Visits

Get historical visits.

**Endpoint:** `GET /api/visit/past-vists`
**Authorization:** Required

**Query Parameters:**

- `from` (optional): Start date (YYYY-MM-DD)
- `to` (optional): End date (YYYY-MM-DD)
- `page` (optional): Page number
- `limit` (optional): Items per page
- `lead_id` (optional): Filter by specific lead
- `status` (optional): Filter by visit status
- `view` (optional): "history" or "past_visits"

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "visit_id": 789,
      "lead": {
        "lead_id": 123,
        "name": "John Customer",
        "company": "Customer Company"
      },
      "check_in_time": "2024-01-15T09:00:00.000Z",
      "check_out_time": "2024-01-15T10:30:00.000Z",
      "status": "Completed",
      "notes": "Productive meeting",
      "contract": {
        "contract_id": 456,
        "status": "Signed"
      }
    }
  ],
  "meta": {
    "totalItems": 50,
    "currentPage": 1,
    "totalPages": 5
  }
}
```

## Get Daily Route

Get optimized daily route for sales rep.

**Endpoint:** `GET /api/visit/route/daily`
**Authorization:** Required

**Response:**

```json
{
  "success": true,
  "message": "Retrieved successfully",
  "data": [
    {
      "lead_id": 123,
      "name": "John Customer",
      "latitude": 60.1699,
      "longitude": 24.9384,
      "address": "123 Main St, Helsinki, Finland 00100",
      "eta": "09:30",
      "distance": 5.2,
      "segmentDistance": 2.1,
      "cumulativeTime": 15,
      "visit_id": 456,
      "lead_status": "Prospect"
    }
  ]
}
```

## Refresh Daily Route

Refresh and optimize daily route.

**Endpoint:** `GET /api/visit/route/refresh`
**Authorization:** Required

**Query Parameters:**

- `latitude`: Current latitude
- `longitude`: Current longitude

**Response:**

```json
{
  "success": true,
  "message": "Daily route optimized successfully",
  "data": [
    {
      "lead_id": 123,
      "eta": "09:30",
      "distance": 5.2,
      "segmentDistance": 2.1,
      "cumulativeTime": 15
    }
  ]
}
```

## Update Route with Current Location

Update route calculations based on current location.

**Endpoint:** `POST /api/visit/route/update-location`
**Authorization:** Required

**Request Body:**

```json
{
  "latitude": 60.1699,
  "longitude": 24.9384
}
```

**Response:**

```json
{
  "success": true,
  "message": "Route updated with current location",
  "data": [
    {
      "lead_id": 123,
      "eta": "10:15",
      "distance": 3.8,
      "segmentDistance": 1.5,
      "cumulativeTime": 12
    }
  ]
}
```

---

# Contract Management APIs

Base path: `/api/contract`

## Get Templates for Sales Rep

Get contract templates available to sales rep.

**Endpoint:** `GET /api/contract/templates/sale-rep`
**Authorization:** Required

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "title": "Service Agreement",
      "status": "active",
      "dropdown_fields": {
        "service_type": {
          "label": "Service Type",
          "options": [
            { "label": "Basic", "value": "basic" },
            { "label": "Premium", "value": "premium" }
          ],
          "required": true
        }
      }
    }
  ]
}
```

## Create Contract Template

Create a new contract template.

**Endpoint:** `POST /api/contract/templates`
**Authorization:** Required

**Request Body:**

```json
{
  "title": "Service Agreement",
  "content": "<h1>Service Agreement</h1><p>Customer: {customer_name}</p><p>Service: {dropdown:service_type}</p><div>Signature: {signature_image}</div>",
  "status": "active",
  "assigned_manager_ids": [123, 456],
  "dropdown_fields": {
    "service_type": {
      "label": "Service Type",
      "options": [
        { "label": "Basic Service", "value": "basic" },
        { "label": "Premium Service", "value": "premium" }
      ],
      "required": true,
      "placeholder": "Select service type"
    }
  }
}
```

**Response:**

```json
{
  "success": true,
  "message": "Contract template created successfully",
  "data": {
    "id": 123,
    "title": "Service Agreement",
    "content": "...",
    "status": "active",
    "dropdown_fields": {...},
    "assigned_managers": [
      {
        "user_id": 123,
        "full_name": "Manager Name"
      }
    ]
  }
}
```

## Get All Contract Templates

Get list of contract templates.

**Endpoint:** `GET /api/contract/templates`
**Authorization:** Required

## Get All Contracts

Get list of signed contracts.

**Endpoint:** `GET /api/contract`
**Authorization:** Required

**Query Parameters:**

- `managerId` (optional): Filter by manager
- `status` (optional): Filter by contract status
- `search` (optional): Search term
- `sortBy` (optional): Sort by "signedCount", "title", or "date"
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response:**

```json
{
  "success": true,
  "data": {
    "contracts": [
      {
        "id": 123,
        "template": {
          "title": "Service Agreement"
        },
        "visit": {
          "lead": {
            "name": "John Customer"
          }
        },
        "signed_at": "2024-01-15T14:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "totalPages": 5
    }
  }
}
```

## Submit Contract with Visit

Submit a signed contract during visit.

**Endpoint:** `POST /api/contract/submit`
**Authorization:** Required

**Request Body:** Multipart form data

- `lead_id`: Lead ID
- `contract_template_id`: Template ID
- `metadata`: JSON string with contract data
- `dropdownValues`: JSON string with dropdown selections
- `signature`: Signature image file

**Example metadata:**

```json
{
  "customer_name": "John Doe",
  "contract_date": "2024-01-15",
  "signature_date": "2024-01-15"
}
```

**Example dropdownValues:**

```json
{
  "service_type": "premium"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Contract submitted successfully",
  "data": {
    "contract_id": 789,
    "visit_id": 456,
    "pdf_generated": true,
    "signature_uploaded": true
  }
}
```

## Submit Contract PDF
Submit a pre-signed contract PDF directly.

**Endpoint:** `POST /api/contract/submit-pdf`
**Authorization:** Required (Bearer token)
**Content-Type:** `multipart/form-data`

**Request Body:** Multipart form data
- `lead_id`: Lead ID (required)
- `contract_template_id`: Template ID (required)
- `metadata`: JSON string with contract data (required)
- `dropdownValues`: JSON string with dropdown selections (required)
- `contract_pdf`: Contract PDF file (required)

**Example metadata:**
```json
{
  "customer_name": "John Doe",
  "contract_date": "2024-01-15",
  "signature_date": "2024-01-15",
  "phone": "+1-555-123-4567",
  "email": "john.doe@example.com",
  "address": "123 Main St, Anytown, ST 12345"
}
```

**Example dropdownValues:**
```json
{
  "service_type": "premium",
  "payment_plan": "monthly",
  "contract_duration": "12_months"
}
```

**JavaScript Example:**
```javascript
const formData = new FormData();
formData.append('lead_id', '123');
formData.append('contract_template_id', '456');
formData.append('metadata', JSON.stringify({
  "customer_name": "John Doe",
  "contract_date": "2024-01-15",
  "signature_date": "2024-01-15"
}));
formData.append('dropdownValues', JSON.stringify({
  "service_type": "premium",
  "payment_plan": "monthly"
}));
formData.append('contract_pdf', pdfFile);

fetch('/api/contract/submit-pdf', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your_jwt_token'
  },
  body: formData
});
```

**cURL Example:**
```bash
curl -X POST \
  'http://localhost:3000/api/contract/submit-pdf' \
  -H 'Authorization: Bearer your_jwt_token' \
  -F 'lead_id=123' \
  -F 'contract_template_id=456' \
  -F 'metadata={"customer_name":"John Doe","contract_date":"2024-01-15","signature_date":"2024-01-15"}' \
  -F 'dropdownValues={"service_type":"premium","payment_plan":"monthly"}' \
  -F 'contract_pdf=@/path/to/signed_contract.pdf'
```

**Response:**
```json
{
  "success": true,
  "message": "Contract PDF submitted successfully",
  "data": {
    "contract_id": 789,
    "visit_id": 456,
    "pdf_uploaded": true
  }
}
```

## Get Contract PDF

Get PDF of signed contract.

**Endpoint:** `GET /api/contract/:contractId/pdf`

**Response:** PDF file download

## Reassign Contract Template

Reassign template to different managers.

**Endpoint:** `PUT /api/contract/templates/:templateId`
**Authorization:** Required

**Request Body:**

```json
{
  "assigned_manager_ids": [106, 111]
}
```

## Update Contract Template

Update contract template content and settings.

**Endpoint:** `PATCH /api/contract/templates/:templateId`
**Authorization:** Required

**Request Body:**

```json
{
  "title": "Updated Title",
  "content": "Updated content",
  "status": "active",
  "assigned_manager_ids": [106, 111],
  "dropdown_fields": {
    "service_type": {
      "label": "Service Type",
      "options": [
        { "label": "Basic", "value": "basic" },
        { "label": "Premium", "value": "premium" }
      ]
    }
  }
}
```

## Get Contract Template by ID

Get specific contract template with dropdown fields.

**Endpoint:** `GET /api/contract/templates/:templateId`
**Authorization:** Required

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 123,
    "title": "Service Agreement",
    "content": "HTML content with {dropdown:field_name} tags",
    "status": "active",
    "dropdown_fields": {
      "service_type": {
        "label": "Service Type",
        "options": [
          { "label": "Basic", "value": "basic" },
          { "label": "Premium", "value": "premium" }
        ],
        "required": true
      }
    },
    "assigned_managers": [
      {
        "user_id": 123,
        "full_name": "Manager Name"
      }
    ]
  }
}
```

## Delete Contract

Delete a signed contract and all associated data.

**Endpoint:** `DELETE /api/contract/:contractId`
**Authorization:** Required

**URL Parameters:**

- `contractId`: ID of the contract to delete

**Response (Success):**

```json
{
  "success": true,
  "message": "Contract deleted successfully",
  "data": {
    "contractId": 123
  }
}
```

**Response (Contract Not Found):**

```json
{
  "success": false,
  "message": "Contract not found",
  "statusCode": 404
}
```

**Description:**
This endpoint permanently deletes a contract and all its associated data including:

- Contract images (signature images)
- Contract PDF files
- Updates the associated visit to remove the contract reference

**Note:** This is a destructive operation and cannot be undone. Use with caution.

---

# Territory Management APIs

Base path: `/api/territory`

## Assign Manager to Territory

Assign a manager to territories.

**Endpoint:** `POST /api/territory/assign-manager`
**Authorization:** Required

**Request Body:**

```json
{
  "managerId": 123,
  "territoryIds": [456, 789]
}
```

## Unassign Salesman from Territory

Remove salesman from territory assignment.

**Endpoint:** `POST /api/territory/unassign-salesman`
**Authorization:** Required

**Request Body:**

```json
{
  "salesmanId": 123,
  "territoryId": 456
}
```

## Add Territory

Create a new territory.

**Endpoint:** `POST /api/territory`
**Authorization:** Required

**Request Body:**

```json
{
  "name": "Downtown Helsinki",
  "description": "Central business district",
  "polygon": [
    { "latitude": 60.1699, "longitude": 24.9384 },
    { "latitude": 60.172, "longitude": 24.94 },
    { "latitude": 60.168, "longitude": 24.942 }
  ],
  "color": "#FF5733"
}
```

## Update Territory

Update territory information.

**Endpoint:** `PUT /api/territory/:id`
**Authorization:** Required

**Request Body:**

```json
{
  "name": "Updated Territory Name",
  "description": "Updated description",
  "polygon": [...],
  "color": "#33FF57"
}
```

## Delete Territory

Delete a territory.

**Endpoint:** `DELETE /api/territory/:id`
**Authorization:** Required

## Get Territory by ID

Get specific territory details.

**Endpoint:** `GET /api/territory/:id`
**Authorization:** Required

**Response:**

```json
{
  "success": true,
  "data": {
    "territory_id": 123,
    "name": "Downtown Helsinki",
    "description": "Central business district",
    "polygon": [
      { "latitude": 60.1699, "longitude": 24.9384 },
      { "latitude": 60.172, "longitude": 24.94 }
    ],
    "color": "#FF5733",
    "assigned_manager": {
      "user_id": 456,
      "full_name": "Manager Name"
    },
    "sales_reps": [
      {
        "user_id": 789,
        "full_name": "Sales Rep Name"
      }
    ]
  }
}
```

## Get All Territories

Get list of all territories.

**Endpoint:** `GET /api/territory`
**Authorization:** Required

**Query Parameters:**

- `managerId` (optional): Filter by manager
- `active` (optional): Filter by active status

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "territory_id": 123,
      "name": "Downtown Helsinki",
      "description": "Central business district",
      "polygon": [...],
      "color": "#FF5733",
      "leads_count": 45,
      "assigned_reps": 3
    }
  ]
}
```

---

# Dashboard APIs

Base path: `/api/dashboard`

## Get Dashboard Data

Get dashboard metrics and data.

**Endpoint:** `GET /api/dashboard`
**Authorization:** Required (with customer_import permission)

**Response:**

```json
{
  "success": true,
  "data": {
    "metrics": {
      "total_leads": 1250,
      "leads_this_month": 89,
      "visits_today": 12,
      "contracts_signed": 34
    },
    "charts": {
      "lead_status_distribution": {
        "Prospect": 450,
        "Hot_Lead": 200,
        "Meeting": 150,
        "Signed": 100
      },
      "monthly_performance": [
        { "month": "Jan", "visits": 120, "contracts": 15 },
        { "month": "Feb", "visits": 140, "contracts": 22 }
      ]
    }
  }
}
```

---

# Admin Management APIs

Base path: `/api/admin`

All admin routes require authentication token.

## Get All Roles

Get list of user roles.

**Endpoint:** `GET /api/admin/roles`
**Authorization:** Required

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "role_id": 1,
      "role_name": "ADMIN",
      "permissions": ["customer_create", "customer_view", "customer_edit"]
    },
    {
      "role_id": 2,
      "role_name": "SALES_REP",
      "permissions": ["customer_view", "visit_create"]
    }
  ]
}
```

## Get Daily Routes (Admin)

Get all sales rep routes for today.

**Endpoint:** `GET /api/admin/daily-routes`
**Authorization:** Required

**Response:**

```json
{
  "success": true,
  "data": {
    "routes": [
      {
        "rep_id": 123,
        "rep_name": "Sales Rep Name",
        "route_date": "2024-01-15",
        "total_visits": 6,
        "completed_visits": 3,
        "route_order": [
          {
            "lead_id": 456,
            "eta": "09:30",
            "status": "completed"
          }
        ]
      }
    ],
    "visits": [
      {
        "visit_id": 789,
        "rep_id": 123,
        "lead_id": 456,
        "status": "completed",
        "check_in_time": "2024-01-15T09:25:00.000Z"
      }
    ]
  }
}
```

## Get Visit History (Admin)

Get all visits history with filtering.

**Endpoint:** `GET /api/admin/visit/history`
**Authorization:** Required

**Query Parameters:**

- `salesRepId` (optional): Filter by sales rep
- `managerId` (optional): Filter by manager
- `visitDate` (optional): Filter by specific date
- `sortBy` (optional): Sort field
- `sortOrder` (optional): ASC or DESC
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response:**

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "visit_id": 123,
        "lead": {
          "name": "Customer Name",
          "company": "Customer Company"
        },
        "rep": {
          "full_name": "Sales Rep Name"
        },
        "check_in_time": "2024-01-15T09:00:00.000Z",
        "status": "Completed"
      }
    ],
    "total": 150,
    "page": 1,
    "limit": 10,
    "totalPages": 15
  }
}
```

## Get Rep-Manager List

Get sales rep and manager relationships.

**Endpoint:** `GET /api/admin/rep-manager`
**Authorization:** Required

## Get Dashboard (Admin)

Get admin dashboard data.

**Endpoint:** `GET /api/admin/dashboard`
**Authorization:** Required

**Response:**

```json
{
  "success": true,
  "data": {
    "summary": {
      "total_reps": 25,
      "active_visits": 12,
      "completed_visits": 89,
      "signed_contracts": 23
    },
    "performance": {
      "top_performers": [
        {
          "rep_name": "John Doe",
          "visits": 45,
          "contracts": 12
        }
      ]
    }
  }
}
```

---

# Map & Route APIs

Base path: `/api/map`

## Get Customer Map

Get customers plotted on map.

**Endpoint:** `POST /api/map/customers`
**Authorization:** Required (with empty permission)

**Request Body:**

```json
{
  "bounds": {
    "north": 60.2,
    "south": 60.1,
    "east": 25.0,
    "west": 24.9
  },
  "filters": {
    "status": "Prospect",
    "assigned_to": 123
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "customers": [
      {
        "lead_id": 123,
        "name": "Customer Name",
        "latitude": 60.1699,
        "longitude": 24.9384,
        "status": "Prospect",
        "address": "123 Main St, Helsinki"
      }
    ],
    "total_count": 156
  }
}
```

---

# Messaging APIs

Base path: `/api/message`

## Send Message

Send message to users.

**Endpoint:** `POST /api/message`
**Authorization:** Required (with empty permission)

**Request Body:**

```json
{
  "recipients": [123, 456],
  "subject": "Important Update",
  "message": "Please check your assigned leads for today.",
  "type": "notification"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "message_id": 789,
    "sent_to": 2,
    "failed": 0
  }
}
```

---

# Regional Data APIs

Base path: `/api/regions`

## Get All Regions

Get list of all regions.

**Endpoint:** `GET /api/regions`

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Uusimaa"
    },
    {
      "id": 2,
      "name": "Pirkanmaa"
    }
  ]
}
```

## Get Region by ID

Get specific region with subregions.

**Endpoint:** `GET /api/regions/:id`

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Uusimaa",
    "subregions": [
      {
        "id": 101,
        "name": "Helsinki"
      },
      {
        "id": 102,
        "name": "Espoo"
      }
    ]
  }
}
```

---

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **General endpoints**: 100 requests per 15 minutes
- **Authentication endpoints**: 5 requests per 15 minutes per IP
- **File upload endpoints**: 10 requests per hour

## Pagination

Most list endpoints support pagination with these query parameters:

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)

Paginated responses include metadata:

```json
{
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "totalPages": 15,
    "previousPage": null,
    "nextPage": 2
  }
}
```

## File Uploads

File upload endpoints accept multipart/form-data:

- **Supported formats**: JPG, PNG, PDF, CSV
- **Max file size**: 10MB per file
- **Max files per request**: 10 files

## WebSocket Events

The API supports real-time updates via WebSocket for:

- Visit status updates
- New message notifications
- Route optimization completion

## API Versioning

Current API version: `v1`

Future versions will be accessible via:

```
/api/v2/endpoint
```

## Support

For API support and questions:

- Email: api-support@company.com
- Documentation: https://docs.company.com/api
- Status Page: https://status.company.com
