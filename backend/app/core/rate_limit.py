from slowapi import Limiter
from slowapi.util import get_remote_address

# main.py와 api/v1/diaries.py 양쪽에서 같은 인스턴스를 참조해야 해서(순환 import 방지 목적으로도)
# 별도 모듈로 둔다. 로그인 기반 인증이 아직 없어 클라이언트 IP를 기준으로 제한한다.
limiter = Limiter(key_func=get_remote_address)
