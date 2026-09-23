# 📈 Stocks Dashboard — User Guide

Welcome to the Stocks Dashboard! This tool is designed to help you quickly identify significant price movements (both sudden spikes and sharp drops) for selected Bursa Malaysia stocks using statistical analysis.

---

## ⏱️ Important Notes on Data & Timing

### 1. The 15-Minute Price Delay
All market data is pulled from Yahoo Finance. This data is **not real-time**. Prices are typically delayed by **15 to 20 minutes** during active market hours.

### 2. Market Hours
Bursa Malaysia operates from **Monday to Friday, 9:00 AM to 5:00 PM (MYT)**. 
- During these hours, prices will update (with the 15-minute delay).
- After hours or on weekends, the dashboard will simply show the final closing price from the last trading session.

### 3. Server "Wake Up" Time (Render Free Tier)
The backend API powering this dashboard is hosted on a free server tier. If the dashboard hasn't been visited for a while (15+ minutes), the server goes to "sleep" to save resources. 
* **When you open the site after it has been sleeping, it may take 50 to 90 seconds to load the data the first time.** 
* Once it is awake, switching between stocks will be fast again (1-2 seconds).

---

## 🛠️ How to Use the Dashboard

### Step 1: Select Your Criteria
Use the **Dashboard Settings** at the top of the page to choose what you want to look at:
- **Stock Name**: A dropdown list of 30+ tracked stocks (sorted alphabetically A-Z).
- **Timeline**: Choose how far back you want to look (6 Months up to 10 Years).

### Step 2: Choose Your Detection Method
Below the price chart, you will find sliders to adjust how "Big Moves" are detected. There are two different mathematical methods available:

#### A. Daily Change (%)
This is a straightforward threshold. If you set it to `2%`, the dashboard will highlight every single day where the stock closed exactly 2% higher or lower than the day before.
* *Best for: Finding days with high momentum.*

#### B. Change in Difference (Z-Score)
This is a statistical method. Instead of a fixed percentage, it looks at the stock's *normal* daily volatility over the selected timeline. If you set it to `1.5x`, it will flag days where the price movement was 1.5 times more volatile than its average daily movement. 
* *Best for: Finding highly unusual anomalies, even in generally stable stocks.*

### Step 3: View the Results
Click on the tabs below the sliders (**Daily Change**, **Change in Difference**, or **Both**) to activate the dots on the main chart:
- 🟢 **Green Dots (Spikes)**: The price shot up significantly.
- 🔴 **Red Dots (Drops)**: The price plummeted significantly.

Clicking the **"Both"** tab will only show dots on days that triggered *both* the percentage threshold and the statistical threshold (high confidence moves).

### Step 4: The Summary Table
Whenever you select a tab to show dots on the chart, a table will appear at the bottom of the page. This table lists the exact dates, the percentage change, and the closing price for every single "Big Move" flagged by your chosen method.

---

## 🔄 Refreshing Data
The dashboard does **not** automatically refresh on its own while the tab is open. If you want to check for the latest prices during active market hours, click the **Update Data** button on the right-hand sidebar.
