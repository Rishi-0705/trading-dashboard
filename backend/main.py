from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Map period strings to number of calendar days
PERIOD_DAYS = {
    "6mo":  183,
    "1y":   365,
    "3y":  1095,
    "5y":  1825,
    "10y": 3650,
}

@app.get("/api/stock/{ticker}")
def get_stock_data(ticker: str, period: str = "6mo"):
    try:
        stock = yf.Ticker(ticker)

        # Always use explicit date range so today's candle is included.
        # end = tomorrow prevents yfinance from excluding the current day.
        end   = datetime.today() + timedelta(days=1)
        days  = PERIOD_DAYS.get(period, 183)
        start = end - timedelta(days=days)

        hist = stock.history(
            start=start.strftime("%Y-%m-%d"),
            end=end.strftime("%Y-%m-%d"),
            auto_adjust=True,
            repair=True,
        )

        if hist.empty:
            return {"error": "No data found for the given ticker and period."}

        # Reset index, strip timezone, format dates
        hist.reset_index(inplace=True)
        if hasattr(hist["Date"].dt, "tz") and hist["Date"].dt.tz is not None:
            hist["Date"] = hist["Date"].dt.tz_convert(None)
        hist["Date"] = hist["Date"].dt.strftime("%Y-%m-%d")

        highest    = float(hist["High"].max())
        lowest     = float(hist["Low"].min())
        info       = stock.info
        
        market_cap = info.get("marketCap")
        if not market_cap:
            try:
                market_cap = stock.fast_info['market_cap']
            except Exception:
                market_cap = 0
        
        chart_data = (
            hist[["Date", "Close"]]
            .rename(columns={"Date": "date", "Close": "price"})
            .to_dict("records")
        )

        # Extract Dividend Info
        dividend_yield = info.get("dividendYield")
        recent_dividends = []
        try:
            divs = stock.dividends.tail(6)
            if not divs.empty:
                for d, amount in divs.items():
                    d_str = d.strftime("%Y-%m-%d") if hasattr(d, "strftime") else str(d)[:10]
                    recent_dividends.append({"date": d_str, "amount": float(amount)})
                recent_dividends.reverse()
        except Exception:
            pass

        return {
            "ticker":    ticker,
            "period":    period,
            "highest":   highest,
            "lowest":    lowest,
            "marketCap": market_cap,
            "dividendYield": dividend_yield,
            "recentDividends": recent_dividends,
            "chartData": chart_data,
        }
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
