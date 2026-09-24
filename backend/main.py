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

        # Extract Quarterly Financials
        financials_data = []
        try:
            q_stmt = stock.quarterly_income_stmt
            if not q_stmt.empty:
                # Transpose to iterate by date (columns are dates)
                rev_key = "Total Revenue"
                ni_key = "Net Income"
                for col_date in q_stmt.columns:
                    try:
                        rev = float(q_stmt.at[rev_key, col_date]) if rev_key in q_stmt.index else 0
                        ni = float(q_stmt.at[ni_key, col_date]) if ni_key in q_stmt.index else 0
                        margin = (ni / rev * 100) if rev > 0 else 0
                        date_str = col_date.strftime("%Y-%m") if hasattr(col_date, "strftime") else str(col_date)[:7]
                        
                        financials_data.append({
                            "date": date_str,
                            "revenue": rev,
                            "netProfit": ni,
                            "margin": float(margin)
                        })
                    except Exception:
                        pass
                # Reverse to chronological order
                financials_data.reverse()
        except Exception as e:
            print("Error fetching financials:", e)

        # Extract Dividend Info
        dividend_yield = info.get("dividendYield")
        recent_dividends = []
        try:
            divs = stock.dividends.tail(6)
            if not divs.empty:
                for d, amount in divs.items():
                    d_str = d.strftime("%Y-%m-%d") if hasattr(d, "strftime") else str(d)[:10]
                    
                    closest_rev = None
                    closest_ni = None
                    if len(financials_data) > 0:
                        div_ym = d_str[:7]
                        for fd in reversed(financials_data):
                            if fd["date"] <= div_ym:
                                closest_rev = fd["revenue"]
                                closest_ni = fd["netProfit"]
                                break
                        if closest_rev is None:
                            closest_rev = financials_data[0]["revenue"]
                            closest_ni = financials_data[0]["netProfit"]
                            
                    recent_dividends.append({
                        "date": d_str, 
                        "amount": float(amount),
                        "revenue": closest_rev,
                        "netProfit": closest_ni
                    })
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
            "financialsData": financials_data,
        }
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
