# City Bloom

Build a modern, professional, responsive Smart Waste Collection Management Dashboard for a Municipal Corporation.

The system is designed to help municipal authorities monitor and manage waste-collection vehicles, optimize collection routes, track vehicles in real time, monitor fuel and operational costs, identify inefficient routes, and analyze overall waste-collection performance.

1. Overall Product

Create a web-based dashboard called:

"Smart Waste Collection Management System"

Subtitle:
"Municipal Corporation • Intelligent Fleet & Waste Operations"

The dashboard should look like a real enterprise municipal operations platform, not a generic admin dashboard.

Use a clean modern design with:

White/light gray background

Dark navy/charcoal text

Green as the primary environmental/waste-management accent

Blue for information

Orange/yellow for warnings

Red for critical alerts

Rounded cards

Subtle shadows

Clean typography

Professional charts

Responsive layout

Desktop-first design but fully responsive for tablets and mobile

Use icons from Lucide React or another modern icon library.

2. Main Layout

Create a fixed left sidebar navigation and a top header.

Sidebar

Logo:
SWCM

Text:
Smart Waste Management

Navigation:

Dashboard

Live Vehicle Tracking

Vehicles

Route Optimization

Collection Zones

Waste Monitoring

Cost & Fuel

Analytics & Reports

Alerts

Drivers

Settings

At the bottom show:

Municipal Corporation
Administrator

Include collapse/expand sidebar functionality.

3. Top Header

Header should contain:

Page title

Search bar: "Search vehicle, driver, zone..."

Notification bell

Current date/time

Municipal Corporation selector

Admin profile

Add a small status indicator:

System Status: Operational

4. Main Dashboard

The main dashboard should provide an operational overview.

KPI Cards

Create 6 KPI cards:

Total Vehicles

Example:
128

112 Active

8 Maintenance

8 Offline

Icon: Truck

Vehicles On Route

84
+8.4% vs yesterday

Waste Collected Today

246.8 Tons
+12.5% vs yesterday

Total Distance Today

3,842 km
-5.2% vs yesterday

Operational Cost

₹1.84 Lakh
Today

Fuel Consumed

1,284 L
Today

Each card should have:

Icon

Main value

Supporting metric

Trend indicator

Small visual indicator

5. Live Vehicle Map

Create a large map section titled:

Live Vehicle Tracking

Use a realistic map interface.

Display:

Vehicle markers

Different marker colors based on status

Route lines

Collection zones

Depots

Waste transfer stations

Vehicle marker statuses:

🟢 Active / Collecting
🔵 Traveling
🟡 Delayed
🔴 Emergency
⚫ Offline

When clicking a vehicle marker, open a popup containing:

Vehicle ID
Vehicle Number
Vehicle Type
Driver
Current Speed
Fuel Level
Current Load
Maximum Capacity
Current Route
ETA
Last Updated

Example:

Vehicle ID: V-1042
Vehicle No: MH-12-AB-4521
Type: Compactor
Driver: Rajesh Patil
Speed: 32 km/h
Fuel: 68%
Waste Load: 72%
ETA: 14 min
Status: Collecting

Add map controls:

Zoom

Full screen

Current location

Map/Satellite toggle

Vehicle filter

Zone filter

For the frontend, use mock vehicle coordinates and simulated real-time movement.

6. Vehicle Fleet Page

Create a dedicated Vehicles page.

Display vehicles in a searchable and filterable table.

Columns:

Vehicle ID
Vehicle Number
Type
Driver
Zone
Status
Fuel
Waste Load
Mileage
Today's Distance
Today's Cost
Last Maintenance
Actions

Vehicle types:

Garbage Compactor

Mini Tipper

Truck

Electric Waste Vehicle

Transfer Vehicle

Statuses:

Active

Collecting

Traveling

Idle

Maintenance

Offline

Add filters:

Status
Vehicle Type
Zone
Driver
Fuel Level

Add buttons:

+ Add Vehicle

Export Report

Each vehicle should have a View Details action.

7. Vehicle Details Page

When a vehicle is selected, show a detailed vehicle profile.

Header:

Vehicle Number
Status
Vehicle Type

Example:

MH-12-AB-4521
Garbage Compactor
● Active

Display cards:

Current Location
Current Speed
Fuel Level
Waste Load
Today's Distance
Today's Cost
Average Mileage
Operating Hours

Then show:

Live Location

Large map showing the current vehicle location and route.

Vehicle Performance

Charts for:

Speed over time

Fuel consumption

Distance traveled

Waste collected

Maintenance

Show:

Last Service
Next Service
Maintenance Cost
Service History

Driver Information

Driver name
Phone
Experience
Current shift
Assigned zone

8. Route Optimization Page

Create a major feature called:

AI Route Optimization

This page should allow municipal officials to optimize waste collection routes.

Top controls:

Select Date
Select Zone
Select Vehicles
Optimization Objective

Optimization objectives:

Minimum Distance

Minimum Fuel Cost

Minimum Time

Maximum Waste Collection Efficiency

Balanced Optimization

Button:

Optimize Routes

Show before/after comparison.

Current Route

Distance:
1,284 km

Estimated Cost:
₹62,400

Estimated Time:
9h 42m

Optimized Route

Distance:
1,012 km

Estimated Cost:
₹48,600

Estimated Time:
8h 05m

Show savings:

Distance Saved: 272 km
Fuel Saved: 91 L
Cost Saved: ₹13,800
Time Saved: 1h 37m

Use a map showing:

Current route → dashed gray line
Optimized route → green line

Show route stops:

Depot
Zone A
Zone B
Zone C
Zone D
Transfer Station

9. Route Details

Create a route table:

Route ID
Vehicle
Driver
Zone
Stops
Distance
Estimated Time
Fuel
Cost
Waste Capacity
Waste Collected
Status

Example:

R-204
V-1042
Rajesh Patil
Zone 4
26 stops
48 km
2h 14m
18 L
₹2,450
95%
82%
On Route

10. Collection Zones

Create a Collection Zones page.

Display zones on a map.

Example:

Zone 1 — Central
Zone 2 — North
Zone 3 — South
Zone 4 — East
Zone 5 — West

For each zone show:

Population
Households
Daily Waste
Vehicles Assigned
Collection Rate
Average Route Distance
Average Cost
Missed Collections

Use different map colors based on collection efficiency.

Example:

Green = >90%
Yellow = 70–90%
Red = <70%

11. Waste Monitoring

Create a page for monitoring waste collection.

Show KPI cards:

Total Waste Today
Organic Waste
Recyclable Waste
Dry Waste
Wet Waste
Uncollected Waste

Create charts:

Waste Collected by Day

Line chart for last 30 days.

Waste by Category

Donut chart:
Organic
Plastic
Paper
Metal
Other

Waste by Zone

Bar chart comparing zones.

Vehicle Capacity Utilization

Horizontal bar chart showing:

Vehicle
Capacity
Collected
Remaining

12. Cost & Fuel Dashboard

Create a dedicated Cost & Fuel Analytics page.

Show:

Total Operating Cost
Fuel Cost
Maintenance Cost
Driver Cost
Cost per Kilometer
Cost per Ton

Charts:

Daily Operating Cost

Line chart

Fuel Consumption

Area/line chart

Cost by Vehicle

Bar chart

Cost by Zone

Bar chart

Fuel Efficiency

Vehicle comparison table

Columns:

Vehicle
Distance
Fuel Used
Mileage
Fuel Cost
Maintenance Cost
Total Cost
Cost/km
Cost/ton

Use Indian Rupee formatting.

Example:

₹1,84,250

13. Analytics & Reports

Create an analytics page with date range selector.

Filters:

Today
7 Days
30 Days
3 Months
Custom Range

Show:

Fleet Utilization
Collection Efficiency
Average Route Distance
Average Fuel Consumption
Cost per Kilometer
Cost per Ton
Waste Collection Rate
Missed Collection Rate

Charts:

Fleet utilization trend

Waste collection trend

Fuel consumption trend

Cost trend

Route efficiency trend

Zone performance comparison

Add:

Download Report

and

Export CSV

buttons.

14. Alerts & Notifications

Create an alerts page.

Alert categories:

🔴 Critical
🟠 Warning
🔵 Information

Examples:

"Vehicle V-1042 has exceeded expected route time."

"Vehicle V-1098 fuel level below 15%."

"Vehicle V-1034 requires maintenance in 500 km."

"Zone 5 has 14 missed collection points."

"Vehicle V-1012 has deviated from optimized route."

"Unusual fuel consumption detected for V-1088."

Each alert should contain:

Time
Vehicle/Zone
Alert type
Description
Status

Actions:

View
Acknowledge
Resolve

15. Drivers Page

Create a driver management page.

Table:

Driver ID
Name
Assigned Vehicle
Zone
Shift
Trips Today
Distance
Safety Score
Status

Driver profile should show:

Name
Employee ID
Phone
Assigned vehicle
Current route
Working hours
Trips completed
Distance traveled
Performance metrics

16. Dashboard Charts

Use realistic mock data.

Do NOT use empty charts.

Generate realistic municipal waste-management sample data.

Charts should include:

Line charts

Bar charts

Donut charts

Area charts

KPI cards

Progress bars

Use Recharts or another reliable React charting library.

Charts must have:

Tooltips

Legends where appropriate

Proper labels

Responsive sizing

17. Real-Time Simulation

Since this is frontend-only, create simulated real-time updates.

Every few seconds:

Vehicle locations should slightly change

Speed should change

Fuel should gradually decrease

Waste load should increase

Vehicle status can change

Display:

Last updated: 10 seconds ago

Add a small green pulse indicator:

LIVE

Make the dashboard feel like a real fleet-monitoring system.

18. Search & Filtering

Global search should support:

Vehicle number
Vehicle ID
Driver
Zone
Route ID

Tables should support:

Search

Sort

Filter

Pagination

19. Responsive Design

Desktop:
Sidebar + dashboard content

Tablet:
Collapsible sidebar

Mobile:
Bottom navigation or collapsible menu

Maps and tables must remain usable on smaller screens.

20. UI/UX Requirements

The design should look similar to a professional:

Smart city operations center

Fleet management system

Logistics control tower

Municipal command center

Avoid:

Excessive gradients

Cartoonish illustrations

Huge text

Excessive animations

Generic SaaS landing-page styling

Use subtle animations only for:

Live vehicle markers

Status changes

KPI updates

Loading states

Notifications

21. Technology

Build the frontend using:

React

TypeScript

Tailwind CSS

shadcn/ui

Lucide icons

Recharts

React Router

For the map, use a map library such as:

Leaflet / React Leaflet
or

Mapbox

If an API key is unavailable, use a realistic mock-map implementation or OpenStreetMap-compatible setup.

Do not require a backend.

Use mock JSON/TypeScript data for:

vehicles
drivers
routes
zones
waste collection
fuel
costs
alerts

Keep the data layer structured so a real REST API can easily replace the mock data later.

22. Component Architecture

Create reusable components:

DashboardLayout
Sidebar
Header
KPICard
VehicleMap
VehicleMarker
VehiclePopup
VehicleTable
VehicleStatusBadge
RouteCard
RouteMap
RouteComparison
ZoneMap
WasteChart
CostChart
FuelChart
AlertCard
NotificationPanel
FilterBar
DateRangePicker
DataTable
StatCard

Use reusable components instead of duplicating UI.

23. Important Dashboard Interaction

The most important user flow should be:

Dashboard
→ See fleet overview
→ Open Live Vehicle Tracking
→ Select vehicle
→ View current location
→ View route
→ Check fuel and waste load
→ Open Route Optimization
→ Optimize route
→ Compare current vs optimized route
→ View estimated distance/fuel/cost savings

Make this workflow visually obvious.

24. Sample Data

Create at least:

100 vehicles
50 drivers
10 collection zones
30 routes
30 days of historical waste data
30 days of fuel/cost data
20 alerts

Use realistic Indian municipal data.

Vehicle numbers should look like:

MH-12-AB-4521
MH-12-CD-7843
MH-14-EF-2918
MH-09-GH-5632

Use Indian names for drivers.

Use realistic values in:

₹
km
liters
tons
hours
percentage

25. Dashboard Header

The main dashboard should start with:

Smart Waste Collection Management

"Real-time fleet monitoring, route optimization & operational intelligence"

Then show:

Live • 128 Vehicles • 10 Zones • Updated just now

26. Demo/Presentation Quality

This application will be demonstrated to municipal officials and evaluators.

Therefore:

Make the dashboard visually impressive

Use realistic data

Make all navigation functional

Make filters work

Make charts interactive

Make vehicle details clickable

Make route optimization produce a simulated result

Make map markers interactive

Make alerts interactive

Include loading states

Include empty/error states where appropriate

Avoid placeholder "Lorem ipsum"

Avoid broken buttons

Ensure there are no console errors

The final result should feel like a production-ready Smart City Waste Collection Fleet Management platform, even though the current implementation uses mock frontend data.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/46ac8e8c-3e54-5a6c-aef5-ae250b48ffb5).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
