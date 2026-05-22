# Project of Data Visualization (COM-480)

| Student's name | SCIPER |
| -------------- | ------ |
| Missipsa Annane | 423060 |
| Lingyi Zhu | 423013 |
| Yujia Wang | 423111 |

## Milestone 2 (17th April, 5pm)

**10% of the final grade**

### 1. Project Goal
Our project aims to provide a comprehensive analysis of the beverage market landscape in China, focusing on brand competition, consumer behavior, and regional differences. By integrating a **Shops Dataset** (1,219 brands) with a granular **Consumer Dataset** (31,800 orders), we seek to bridge the gap between high-level market trends and personalized user experiences. The visualization will help users understand how pricing, scale, and demographics interact in one of the world's most dynamic consumer markets.

### 2. Core Visualization (Minimal Viable Product)
To fulfill the core requirements of the project, we will implement the following "Brand Market Landscape" components as our MVP:

* **Interactive Bubble/Logo Cloud:** A central visualization showing the Top 20 drink shops. Bubble radius will represent the *Store Count*, allowing users to identify market leaders instantly.
* **Brand Matrix (Scatter Plot):** A "Price vs. Store Count" plot to categorize brands into premium, mass-market, and niche segments.
* **Faceted Price Histograms:** Distribution charts segmented by brand type (Tea, Coffee, Milk drinks) to show pricing strategies across different sectors.
* **Functional Website Skeleton:** A structured multi-page layout with a navigation bar to switch between market overview and behavior analysis.

### 3. Extra Ideas & Enhanced Features
These modular features will be added to enhance interactivity and storytelling depth:

* **Consumer Behavior Dashboard:** Four synchronized charts (Pie/Donut) visualizing:
    * *Scenario & Motive:* Delivery vs. dine-in; Social vs. Novelty seeking.
    * *Demographics:* Distributions across Gender and Age-groups.
* **Regional Tier Analysis (Pyramid):** A hierarchical visualization representing 1st, 2nd, and 3rd-tier cities to show brand penetration.
* **3rd-Tier City Drill-down Map:** A detailed geospatial view focusing on emerging markets (e.g., Xiangyang, Shantou) from 2019 to 2023.
* **Personalized Recommendation Tool:** A decision-tree style interactive widget that suggests brands based on user-inputted demographics.

### 4. Tools and Lectures
#### Tools
* **D3.js / TopoJSON:** For the interactive bubble charts and geographic map visualizations.
* **Svelte/React:** For managing application state and synchronized filtering across components.
* **Python (Pandas):** For data cleaning and joining the 1,219 brands with 31,800 order records.

#### Lectures Needed
* **Past Lectures:** Perception & Colors (for branding and map design), D3.js basics, and Interaction techniques.
* **Future Lectures:** Advanced Interaction (for linked views) and Storytelling techniques to guide the user through the data layers.

### 5. Implementation Breakdown
1.  **Phase 1 (Skeleton):** Build the basic web structure and navigation based on the design sketches.
2.  **Phase 2 (Market MVP):** Implement the bubble cloud and scatter plots using the Shops Dataset.
3.  **Phase 3 (Consumer Behavior):** Integrate the Order Dataset to build interactive filters and demographic charts.
4.  **Phase 4 (Advanced Features):** Develop the City Tier pyramid and the recommendation engine; polish the UI/UX.

**Prototype URL:** [https://com-480-data-visualization.github.io/projdataviz/](https://com-480-data-visualization.github.io/projdataviz/)
<img width="4960" height="3507" alt="Webpage Sketch_V2" src="https://github.com/user-attachments/assets/ea83f82b-9185-4ede-96c5-512d171e0787" />