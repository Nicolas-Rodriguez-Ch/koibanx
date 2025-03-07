# Koibanx Challenge

A Node.js service for uploading Excel spreadsheets with format validation and asynchronous processing. This API follows Clean Architecture principles and efficiently handles large datasets without blocking the HTTP interface.

## Features

- Upload `.xlsx` files and process them asynchronously
- Track processing status with task IDs
- Configurable data mapping formats
- Paginated access to processing errors
- Paginated access to processed data
- Handles spreadsheets with up to 200,000 rows
- Processes number fields with up to 5,000 numbers
- Secure API with permission-based access

## Project Structure

```
root/
│
├── src/
│   ├── api/                   # API routes
│   ├── config/                # Express configuration
│   ├── database/              # Database connection and models
│   ├── middleware/            # API middleware (auth, upload)
│   ├── services/              # Business logic services
│   ├── app.ts                 # Express app setup
│   └── routes.ts              # Route configuration
│
├── tests/                     # Test files
├── uploads/                   # Temporary storage for uploads
├── constants/                 # Environment constants
├── .env                       # Environment variables
├── .env.example               # Example environment variables
├── Koibanx.postman_collection.json  # Postman collection for the API
└── README.md                  # This file
```

## Installation and Setup

### Prerequisites

- Node.js (v14+)
- MongoDB (local or Atlas)
- Yarn package manager

### Environment Variables

Create a `.env` file in the project root with the following variables:

```
PORT=3000
DB_URI=mongodb://localhost:27017/excel-processor
READ_API_KEY=your-read-api-key
ADMIN_API_KEY=your-admin-api-key
```

### Installation

```bash
# Clone the repository
git clone https://github.com/Nicolas-Rodriguez-Ch/koibanx

# Navigate to the project directory
cd koibanx

# Install dependencies
yarn install

# Start the server
yarn start

# For development with auto-restart
yarn dev
```

## API Documentation

### Authentication

All API endpoints are secured with API keys. Include your API key in the `X-API-KEY` header:

```
X-API-KEY: your-api-key
```

There are two permission levels:

- **Read-only**: Can check status and retrieve data
- **Admin**: Can upload files and perform all read operations

### Endpoints

#### Upload Excel File

```
POST /api/task/upload
```

**Permission Level**: Admin (write permission)

**Request**:

- Body: Form data with:
  - `file`: Excel file (`.xlsx`)
  - `mappingFormat`: Mapping format name (default: "default")

**Response**:

```json
{
  "taskId": "60a1b2c3d4e5f6a7b8c9d0e1",
  "message": "File uploaded successfully and queued for processing"
}
```

#### Check Task Status

```
GET /api/task/:taskId/status
```

**Permission Level**: Read

**Response**:

```json
{
  "status": "processing", // "pending", "processing", or "done"
  "totalRows": 1000,
  "processedRows": 750,
  "errors": 25
}
```

#### Retrieve Task Errors

```
GET /api/task/:taskId/errors?page=1&limit=10
```

**Permission Level**: Read

**Query Parameters**:

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

**Response**:

```json
{
  "errors": [
    { "row": 2, "col": 1, "message": "Invalid name" },
    { "row": 5, "col": 2, "message": "Invalid age" }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "pages": 3
  }
}
```

#### Retrieve Processed Data

```
GET /api/task/:taskId/data?page=1&limit=10
```

**Permission Level**: Read

**Query Parameters**:

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

**Response**:

```json
{
  "data": [
    {
      "name": "Esteban",
      "age": 30,
      "nums": [1, 3, 8, 9, 12, 32, 34, 78, 97, 100]
    }
  ],
  "pagination": {
    "total": 200,
    "page": 1,
    "limit": 10,
    "pages": 20
  }
}
```

## Mapping Formats

The API supports different mapping formats to transform Excel data into JSON. The default mapping format expects:

- Column 1: Name (string)
- Column 2: Age (number)
- Column 3: Nums (comma-separated numbers)

For example, given a row:

```
Esteban  30  3,8,1,9,100,34,78,32,97,12
```

The resulting JSON would be:

```json
{
  "name": "Esteban",
  "age": 30,
  "nums": [1, 3, 8, 9, 12, 32, 34, 78, 97, 100]
}
```

## Error Handling

The API validates data types strictly:

- `name`: Must be a non-empty string
- `age`: Must be a number between 0 and 150
- `nums`: Must be parseable as numbers and will be sorted in ascending order

If validation fails, errors are recorded with row and column information for debugging.

## Testing

Run the test suite with:

```bash
# Run all tests
yarn test

# Run tests with coverage report
yarn test:coverage
```

## Performance Considerations

- The service uses background processing to handle large files without blocking the HTTP interface
- Files are processed in chunks to manage memory efficiently
- Data is stored in MongoDB for efficient pagination and querying
- The service can handle 200,000+ row spreadsheets and numbers lists with up to 5,000 items

## Development Notes

- Use the provided test suite to validate changes
- Follow the established clean architecture pattern
