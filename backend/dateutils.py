from datetime import datetime, date
from typing import Optional, Union

def date_to_datetime(d: Union[date, str, None]) -> Optional[datetime]:
    """
    Преобразует объект date в datetime.
    Если передана строка, пытается преобразовать её в datetime.
    Если передано None, возвращает None.
    """
    if d is None:
        return None
    
    if isinstance(d, str):
        try:
            # Пытаемся преобразовать строку в datetime
            return datetime.fromisoformat(d)
        except ValueError:
            try:
                # Если строка в формате YYYY-MM-DD
                return datetime.strptime(d, "%Y-%m-%d")
            except ValueError:
                # Если не удалось преобразовать строку, возвращаем текущий datetime
                return datetime.now()
    
    if isinstance(d, date) and not isinstance(d, datetime):
        # Если это объект date, преобразуем его в datetime
        return datetime.combine(d, datetime.min.time())
    
    if isinstance(d, datetime):
        # Если это уже datetime, просто возвращаем его
        return d
    
    # В остальных случаях возвращаем текущий datetime
    return datetime.now() 