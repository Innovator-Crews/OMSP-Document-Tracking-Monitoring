# API Contract (localStorage Functions)

## Auth Module (`Auth`)
| Method | Params | Returns | Description |
|--------|--------|---------|-------------|
| `login(email, password)` | string, string | User \| null | Authenticates, sets session |
| `logout()` | — | void | Clears session, redirects |
| `checkSession()` | — | User \| null | Returns current user |
| `requireAuth()` | — | void | Redirects to login if no session |
| `requireRole(roles[])` | string[] | boolean | Checks current user role |
| `checkPermission(action, resource)` | string, string | boolean | RBAC check |
| `getDashboardForRole(role)` | string | string (URL) | Returns role-specific dashboard |

## Storage Module (`Storage`)
| Method | Params | Returns | Description |
|--------|--------|---------|-------------|
| `init()` | — | void | Seeds defaults if empty |
| `get(key)` | string | any | Parse from localStorage |
| `set(key, data)` | string, any | void | Stringify to localStorage |
| `generateId(prefix)` | string | string | e.g., "fa_a1b2c3" |

## CRUD Operations (`Storage`)
| Method | Params | Returns | Description |
|--------|--------|---------|-------------|
| `getAll(key)` | string | Array | All records |
| `getById(key, id, idField)` | string, string, string | Object \| null | Single record |
| `add(key, record)` | string, Object | Object | Add to array |
| `update(key, id, data, idField)` | string, string, Object, string | boolean | Update record |
| `softDelete(key, id, idField, userId)` | string, string, string, string | boolean | Set is_archived |
| `restore(key, id, idField)` | string, string, string | boolean | Unset is_archived |
| `query(key, filters)` | string, Object | Array | Filter array |

## FA Module (`FAModule`)
| Method | Params | Returns | Description |
|--------|--------|---------|-------------|
| `create(data)` | Object | FA \| Error | Validate, deduct budget, save |
| `validate(data)` | Object | {valid, errors} | Form validation |
| `list(bmId, filters)` | string, Object | Array | Role-filtered list |
| `getById(faId)` | string | FA \| null | Single record |
| `updateStatus(faId, status)` | string, string | boolean | Change status |
| `getStats(bmId)` | string | Object | Budget summary |
| `checkDuplicate(name, dob, barangay)` | string, string, string | Match[] | Find duplicates |
| `calculateNextDate(date, months)` | string, number | string | Next available date |

## PA Module (`PAModule`)
| Method | Params | Returns | Description |
|--------|--------|---------|-------------|
| `create(data)` | Object | PA \| Error | Save PA record |
| `validate(data)` | Object | {valid, errors} | Form validation |
| `list(filters)` | Object | Array | All PA (transparent) |
| `getById(paId)` | string | PA \| null | Single record |
| `checkWaitingPeriod(beneficiaryId, bmId)` | string, string | {eligible, nextDate, days} | Cooling check |
| `skipWaiting(paId, reason, bmNoted)` | string, string, boolean | boolean | Override |
| `addAllowance(bmId, amount)` | string, number | void | Add PA budget |

## Search Module (`SearchModule`)
| Method | Params | Returns | Description |
|--------|--------|---------|-------------|
| `search(query, options)` | string, Object | Array | Quick search |
| `advancedSearch(criteria)` | Object | Array | Full filter search |
| `getFrequencyAnalysis(beneficiaryId)` | string | Object | Monthly analysis |
| `addOfficeNote(beneficiaryId, note, userId)` | string, string, string | void | Add note |

## Category Manager (`CategoryManager`)
| Method | Params | Returns | Description |
|--------|--------|---------|-------------|
| `getAll(type)` | 'fa' \| 'pa' | Array | All categories |
| `getActive(type)` | 'fa' \| 'pa' | Array | Non-archived only |
| `add(type, name, isPermanent, userId)` | string, string, boolean, string | Category | Create |
| `update(type, id, name)` | string, string, string | boolean | Edit name |
| `archive(type, id, userId)` | string, string, string | boolean \| Error | Check deps first |
| `restore(type, id)` | string, string | boolean | Unarchive |
| `delete(type, id)` | string, string | boolean | Permanent delete (admin) |
| `getRecordCount(type, categoryId)` | string, string | number | Count using this |

## Term Manager (`TermManager`)
| Method | Params | Returns | Description |
|--------|--------|---------|-------------|
| `getWarningLevel(bmId)` | string | 'none'\|'info'\|'warning'\|'critical'\|'ended' | Term status |
| `getDaysRemaining(bmId)` | string | number | Days until term end |
| `requestArchive(bmId)` | string | boolean | BM initiates |
| `approveArchive(bmId, adminId)` | string, string | boolean | Admin approves |
| `rejectArchive(bmId, adminId)` | string, string | boolean | Admin rejects |
| `getPendingArchives()` | — | Array | All pending requests |
| `createNewTerm(bmId, termData)` | string, Object | BM | Re-election |
| `isReadOnly(bmId)` | string | boolean | Term ended check |

## Activity Logger (`ActivityLogger`)
| Method | Params | Returns | Description |
|--------|--------|---------|-------------|
| `log(action, details)` | string, Object | LogEntry | Create log |
| `getAll(filters)` | Object | Array | Filtered logs |
| `getByUser(userId)` | string | Array | User's logs |
| `clear(beforeDate)` | string | number | Remove old logs |

## Budget Module (part of Storage)
| Method | Params | Returns | Description |
|--------|--------|---------|-------------|
| `getCurrentBudget(bmId)` | string | Budget | This month's budget |
| `deductFromBudget(bmId, amount)` | string, number | boolean | Validate & deduct |
| `addRollover(bmId)` | string | void | Carry forward |
| `getBudgetHistory(bmId)` | string | Array | Monthly history |
