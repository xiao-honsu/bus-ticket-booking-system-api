# Quick API Reference - Search & Filter

**Quick access guide for frontend developers**

---

## 🔍 City Autocomplete

```http
GET /v1/locations/search?q={query}&limit=10
```

**Use for:** Origin/Destination input fields  
**Debounce:** 300ms recommended

### Example

```javascript
fetch('/v1/locations/search?q=Ho&limit=10')
  .then((res) => res.json())
  .then((data) => console.log(data));
```

### Response

```json
[
  {
    "city": "Hồ Chí Minh",
    "state": "Hồ Chí Minh",
    "displayName": "Hồ Chí Minh, Hồ Chí Minh",
    "type": "both"
  }
]
```

---

## 🎫 Search Trips

```http
GET /v1/trips/search
```

### Basic Search

```
?origin=Ho Chi Minh&destination=Da Nang&departureDate=2025-12-20
```

### With Filters

```
?origin=Ho Chi Minh
&destination=Da Nang
&departureDate=2025-12-20
&minPrice=200000
&maxPrice=400000
&departureTimeFrom=06:00
&departureTimeTo=12:00
&busType=sleeper
&amenities=wifi
&minAvailableSeats=4
&sortBy=price
&sortOrder=asc
&page=1
&limit=10
```

### Response

```json
{
  "results": [
    /* trips array */
  ],
  "page": 1,
  "limit": 10,
  "totalPages": 5,
  "totalResults": 48
}
```

---

## 📋 Query Parameters

### Core Search

| Param           | Type   | Example       |
| --------------- | ------ | ------------- |
| `origin`        | string | `Ho Chi Minh` |
| `destination`   | string | `Da Nang`     |
| `departureDate` | date   | `2025-12-20`  |

### Filters

| Param               | Type   | Values                             |
| ------------------- | ------ | ---------------------------------- |
| `minPrice`          | number | `200000`                           |
| `maxPrice`          | number | `400000`                           |
| `departureTimeFrom` | string | `06:00` (HH:mm)                    |
| `departureTimeTo`   | string | `18:00` (HH:mm)                    |
| `busType`           | string | `standard`, `limousine`, `sleeper` |
| `amenities`         | array  | `wifi`, `ac`, `charging`           |
| `minAvailableSeats` | number | `4`                                |

### Sorting

| Param       | Type   | Values                                                 |
| ----------- | ------ | ------------------------------------------------------ |
| `sortBy`    | string | `price`, `departureTime`, `duration`, `availableSeats` |
| `sortOrder` | string | `asc`, `desc`                                          |

### Pagination

| Param   | Type   | Default | Max |
| ------- | ------ | ------- | --- |
| `page`  | number | 1       | -   |
| `limit` | number | 10      | 50  |

---

## 🎯 Common Use Cases

### Morning Trips

```
?departureTimeFrom=06:00&departureTimeTo=12:00
```

### Budget Sleeper Buses

```
?busType=sleeper&maxPrice=300000&sortBy=price
```

### Premium with WiFi

```
?busType=limousine&amenities=wifi&amenities=ac
```

### Group Booking (4+ seats)

```
?minAvailableSeats=4
```

---

## ⚡ React Examples

### Autocomplete

```jsx
const [query, setQuery] = useState('');
const [results, setResults] = useState([]);

useEffect(() => {
  if (query.length < 2) return;

  const timer = setTimeout(async () => {
    const res = await fetch(`/v1/locations/search?q=${query}`);
    const data = await res.json();
    setResults(data);
  }, 300);

  return () => clearTimeout(timer);
}, [query]);
```

### Search Form

```jsx
const handleSearch = async (e) => {
  e.preventDefault();

  const params = new URLSearchParams({
    origin,
    destination,
    departureDate: date,
  });

  const res = await fetch(`/v1/trips/search?${params}`);
  const data = await res.json();
  setTrips(data.results);
};
```

### Filters

```jsx
const applyFilters = async () => {
  const params = new URLSearchParams({
    ...searchParams,
    ...filters,
    sortBy,
    page: 1,
  });

  const res = await fetch(`/v1/trips/search?${params}`);
  const data = await res.json();
  setTrips(data);
};
```

---

## ❌ Error Handling

### Validation Errors (400)

```json
{
  "code": 400,
  "message": "Validation Error",
  "errors": [
    {
      "field": "departureDate",
      "message": "Departure date cannot be in the past"
    }
  ]
}
```

### No Results (200)

```json
{
  "results": [],
  "totalResults": 0
}
```

**Tip:** Show "No trips found" with suggestions

---

## 🌟 Popular Locations & Routes

### Popular Locations

```http
GET /v1/locations/popular?limit=10
```

```json
[
  { "name": "Hồ Chí Minh", "searchCount": 15420 },
  { "name": "Hà Nội", "searchCount": 12350 }
]
```

### Popular Routes

```http
GET /v1/locations/popular-routes?limit=10
```

```json
[
  {
    "id": "...",
    "routeName": "HCM - Đà Lạt",
    "origin": "Hồ Chí Minh",
    "destination": "Đà Lạt",
    "totalBookings": 3450
  }
]
```

---

## 🚀 Performance Tips

1. **Debounce** autocomplete (300ms)
2. **Cache** popular locations/routes (5-10 min)
3. **Paginate** with reasonable limits (10-20)
4. **Show loading** states
5. **Handle errors** gracefully

---

## 📚 Full Documentation

- **Complete Guide:** `docs/FRONTEND_API_GUIDE.md`
- **Swagger UI:** `http://localhost:3000/api-docs`
- **Implementation:** `docs/agent-generated/SEARCH_FILTER_IMPLEMENTATION.md`

---

**Need help?** Check the full API guide or contact backend team.
