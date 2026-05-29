# ChinaBev: China's Freshly Made Beverage Market
# Project of Data Visualization (COM-480)

**Project URL:** [ChinaBev](https://china-bev.netlify.app/)

**Presentation video:** [Video](https://youtu.be/a-8CaBSqmO4)

**Process book:** [Our process_Book](milestones/Process_Book.pdf)

| Student's name | SCIPER |
| -------------- | ------ |
| Missipsa Annane | 423060 |
| Lingyi Zhu | 423013 |
| Yujia Wang | 423111 |

## 🌟 Project Overview
Outside of China, international consumers often feel completely lost when navigating the modern Chinese tea and freshly made beverage culture due to linguistic barriers and an overwhelming number of milk tea chains. 

**ChinaBev** bridges this gap by merging macro market trends with micro consumer habits into a single, cohesive, story-driven digital experience. 
Combining data from **1,219 beverage brands** and **31,800 consumer order records**, the project guides users through three narrative modules:

1. **Interactive Consumer Preference Tree:** An immediate hook allowing users to find their tailored drink type based on personal preferences.
2. **Brand Market Landscape:** A macro view exploring brand popularity, market shares, store numbers, and pricing strategies.
3. **Consumer Behavior Analysis:** A localized micro-analysis diving into regional demographics, consumption motives, and social trends across different cities.


### Final Website

The final website is a static interactive data visualization built with **HTML**, **CSS**, **JavaScript**, **D3.js**, and **Vite**.

The project explores China's freshly made beverage market through:

- brand market landscape visualizations
- consumer behavior visualizations
- an interactive decision-tree recommendation section

### Technical Setup

Install dependencies:

```bash
npm install
```

Run the project locally:

```bash
npm run dev
```

Open the project:

```bash
http://localhost:3000/
```

### Repository Content

```txt
.
├── index.html                  # Core single-page application entry point
├── package.json                # Project configuration and dependency manifest
├── assets
│   ├── css                     # Unified stylesheets
│   │   └── main.css            # Entry point establishing global CSS variables & theme palettes
│   ├── js                      # Modular visualization logic scripts
│   │   └── main.js             # Asynchronous pipeline & event dispatching orchestrator
│   └── data                    # Preprocessed and translated linguistic schemas
│       ├── drink_shops.json            # Macro brand metrics for 1,219 beverage chains
│       ├── consumer_behavior.json      # Granular micro-transaction dataset of 31,800 orders
│       ├── beverage_decision_tree.json # Structured JSON model mapping prediction nodes
│       ├── city.json                   # Regional metrics stratified by urban city tiers
│       └── product_type_popularity.json# Market share details for the top 5 beverage categories
├── utils                       
│   └── scripts                 # Offline preprocessing and data-cleansing pipelines
└── milestones                  # Project documentation repository
    └── Process_Book.pdf        # Complete design iteration and technical overview document
```

### Data

The project uses local JSON files stored in:

```txt
assets/data/
```

- `drink_shops.json`: brand-level data for 1,219 beverage brands
- `consumer_behavior.json`: consumer order data for 31,800 orders
- `beverage_decision_tree.json`: exported decision-tree model used for the interactive recommendation visualization
- `city.json`: Consumer profile and behavioral data across different city tiers, covering scenarios, motives, age, and gender.
- `product_type_popularity.json`: Market popularity data for 5 major beverage categories and the market share of their top 5 leading brands.

### Process Book

The process book is included in the repository as:

```txt
/milestones/process_book.pdf
```

It describes the design path, challenges, design decisions, changes from the first milestone, and peer assessment.

### Notes

The decision-tree recommendation section is exploratory. It is designed to visualize consumer profile patterns and should not be interpreted as a high-accuracy prediction model.

