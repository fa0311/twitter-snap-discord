# twitter-snap-discord

```env
# .env
DISCORD_TOKEN=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
HTTP_SERVER_PORT=3000
HTTP_BASE=https://example.com
```

## Session

`cookies.json` に twitter と pixiv のCookieが必要

<https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc>

`Export Format: JSON` -> `Export` / `Copy`

```json
[{"domain":".x.com","expirationDate":1762434530.708053,"hostOnly":false,"httpOnly":false,"name":"xxxxxxxxx","path":"/","sameSite":"no_restriction","secure":true,"session":false,"storeId":"0","value":"xxxxxxxxxxxxx"}]
```

## Output

`storage/` に出力される
