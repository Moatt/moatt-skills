---
name: company-funding-search
description: Find company funding history, investors, and investment details
source: orthogonal
---


# Company Funding Search

## Setup

Read your credentials from ~/.moatt/credentials.json:
```bash
export MOATT_API_KEY=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json'))['api_key'])")
export MOATT_API_BASE=$(python3 -c "import json;print(json.load(open('$HOME/.moatt/credentials.json')).get('api_base','https://api.moatt.com'))")
```

If ~/.moatt/credentials.json does not exist, tell the user to run: `npx moatt login`

All endpoints use Bearer auth: `-H "Authorization: Bearer $MOATT_API_KEY"`


Get funding history, investors, and investment details for companies. Two APIs available:
- **Nyne**: Look up specific company's funding history
- **Fiber**: Search companies by funding stage/criteria

## When to Use

- User asks "how much funding has [company] raised?" → Nyne
- User wants to know who invested in a company → Nyne
- User wants to find companies by funding stage → Fiber
- User asks "find Series B AI companies" → Fiber
- Targeting companies by funding criteria → Fiber

---

## Option 1: Nyne (Specific Company Lookup)

Best for: Looking up a known company's funding history and investors.

### Get Company Funding History

**Step 1: Start the lookup (POST)**
```bash
curl -s -X POST $MOATT_API_BASE/v1/proxy/orthogonal/run \
  -H "Authorization: Bearer $MOATT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"api":"","path":"","body":{"company_name":"Anthropic"}}'
```

Returns a `request_id`. Then poll:

**Step 2: Poll for results (GET)**
```bash
curl -s -X POST $MOATT_API_BASE/v1/proxy/orthogonal/run \
  -H "Authorization: Bearer $MOATT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"api":"nyne","path":"/company/funding","query":{"request_id":"YOUR_REQUEST_ID"}}'
```

### Get Company Investors/Funders

```bash
curl -s -X POST $MOATT_API_BASE/v1/proxy/orthogonal/run \
  -H "Authorization: Bearer $MOATT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"api":"nyne","path":"/company/funders","body":{"company_domain":"stripe.com"}}'
```

### Nyne Parameters
- **company_name** - Company name (e.g., "Anthropic") - works better
- **company_domain** - Company domain (e.g., "anthropic.com")

---

## Option 2: Fiber (Search Companies by Funding)

Best for: Finding companies by funding stage, industry, location, etc.

### Natural Language Company Search

```bash
curl -s -X POST $MOATT_API_BASE/v1/proxy/orthogonal/run \
  -H "Authorization: Bearer $MOATT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"api":"fiber","path":"/v1/natural-language-search/companies","body":{"query":"AI companies that raised Series B in 2024","limit":10}}'
```

### Investor Search

Search for investors/VCs (filter-based, not natural language):

```bash
curl -s -X POST $MOATT_API_BASE/v1/proxy/orthogonal/run \
  -H "Authorization: Bearer $MOATT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"api":"fiber","path":"/v1/investor-search","body":{"searchParams":{},"limit":10}}'
```

Returns top investors with:
- Total investments, lead rate
- Investment breakdown by stage
- Recent investments
- LinkedIn, logo, social links

### Fiber Response Includes
- Company name, domain, LinkedIn
- Funding rounds with dates and amounts
- Investors per round (lead vs participating)
- Employee count, location, industry
- Total funding, latest funding stage
- Similar companies

---

## When to Use Which

| Use Case | API | Endpoint |
|----------|-----|----------|
| "How much has Anthropic raised?" | Nyne | /company/funding |
| "Who invested in Stripe?" | Nyne | /company/funders |
| "Find Series A AI startups" | Fiber | /v1/natural-language-search/companies |
| "Find top VCs" | Fiber | /v1/investor-search |
| "Companies that raised $10M+ in 2024" | Fiber | /v1/natural-language-search/companies |

## Error Handling

- **Nyne is async**: POST returns `request_id`, poll with GET — results take 5-20 seconds
- **404** — Company not found; try alternate name or domain
- **429** — Rate limit exceeded; wait and retry
- Fiber returns empty results for very niche queries — broaden search terms
- `company_name` works better than `company_domain` for Nyne lookups

## Tips

- **Nyne is async**: Start with POST, poll with GET using request_id (5-20 seconds)
- **Fiber is sync**: Returns results immediately
- **company_name > company_domain** for Nyne lookups
- Fiber's natural language search is very flexible - just describe what you want
- Fiber returns rich company data including similar companies
