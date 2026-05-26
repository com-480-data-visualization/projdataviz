# Project of Data Visualization (COM-480)

| Student's name | SCIPER |
| -------------- | ------ |
| Missipsa Annane | 423060 |
| Lingyi Zhu | 423013 |
| Yujia Wang | 423111 |

## Milestone 3 (29th May, 5pm)

**80% of the final grade**

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
├── index.html      # only html page
├── package.json
├── assets
│   ├── css         # css styles : main.css is the 'entry point'
│   ├── js          # js scripts : main.js is the entry point
│   └── data        # all the JSON data used throughout the website
├── utils           
│   └── scripts     # offline scripts (not used actively for the website)
└── milestones      # milestones related documents
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

## Late policy

- < 24h: 80% of the grade for the milestone
- < 48h: 70% of the grade for the milestone

