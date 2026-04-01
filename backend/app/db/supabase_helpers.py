from typing import List, Dict, Any, Optional
from app.database import get_supabase

# Valid tables we are permitted to query in this integration
VALID_TABLES = [
    "assessments",
    "assessment_results",
    "assessment_responses",
    "recommendations"
]

def _validate_table(table_name: str):
    if table_name not in VALID_TABLES:
        raise ValueError(f"Table '{table_name}' access is not permitted.")


def get_records(user_id: str, table: str, limit: int = 100, custom_filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    """
    Query records ensuring they belong to the specific user_id.
    """
    _validate_table(table)
    sb = get_supabase()
    
    query = sb.table(table).select("*").eq("user_id", user_id)
    
    if custom_filters:
        for k, v in custom_filters.items():
            query = query.eq(k, v)
            
    result = query.limit(limit).execute()
    return result.data


def insert_record(user_id: str, table: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Insert a record ensuring the user_id is forced into the data payload.
    """
    _validate_table(table)
    # Strictly override or insert user_id into the payload
    payload = {**data, "user_id": user_id}
    
    sb = get_supabase()
    result = sb.table(table).insert(payload).execute()
    return result.data[0] if result.data else {}


def update_record_safely(user_id: str, table: str, record_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Update a record safely by anchoring the operation to the requesting user_id.
    """
    _validate_table(table)
    sb = get_supabase()
    
    # Strip user_id from data if it was passed, so we don't accidentally update it
    safe_data = {k: v for k, v in data.items() if k != "user_id"}
    
    # The crucial part: update ONLY if it matches both id and user_id 
    result = sb.table(table).update(safe_data).eq("id", record_id).eq("user_id", user_id).execute()
    return result.data[0] if result.data else {}


def delete_record_safely(user_id: str, table: str, record_id: str) -> bool:
    """
    Delete a record securely bounded by user_id.
    """
    _validate_table(table)
    sb = get_supabase()
    
    # Delete ONLY if it matches both id and user_id
    result = sb.table(table).delete().eq("id", record_id).eq("user_id", user_id).execute()
    return bool(result.data)

