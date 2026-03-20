# Project of Data Visualization (COM-480)

| Student's name | SCIPER |
| -------------- | ------ |
| Missipsa Annane | 423060 |
| Lingyi Zhu | 423013 |
| Yujia Wang | 423111 |

[Milestone 1](#milestone-1) • [Milestone 2](#milestone-2) • [Milestone 3](#milestone-3)

## Milestone 1 (20th March, 5pm)

**10% of the final grade**

This is a preliminary milestone to let you set up goals for your final project and assess the feasibility of your ideas.
Please, fill the following sections about your project.

*(max. 2000 characters per section)*

### Dataset

> Find a dataset (or multiple) that you will explore. Assess the quality of the data it contains and how much preprocessing / data-cleaning it will require before tackling visualization. We recommend using a standard dataset as this course is not about scraping nor data processing.
>
> Hint: some good pointers for finding quality publicly available datasets ([Google dataset search](https://datasetsearch.research.google.com/), [Kaggle](https://www.kaggle.com/datasets), [OpenSwissData](https://opendata.swiss/en/), [SNAP](https://snap.stanford.edu/data/) and [FiveThirtyEight](https://data.fivethirtyeight.com/)).

### Problematic

> Frame the general topic of your visualization and the main axis that you want to develop.
> - What am I trying to show with my visualization?
> - Think of an overview for the project, your motivation, and the target audience.

## Exploratory Data Analysis
### Pre-processing
The preprocessing was simple and straightforward:

- translated both datasets into English
- kept the original Chinese shop names
- kept the original Chinese city names in the consumer dataset
- removed rows with missing or invalid values
- removed invalid entries such as shops with `Average Price = 0.00`
- sorted the drink shop dataset by `Number of Stores` from highest to lowest
- kept only `tea drinks`, `coffee`, and `milk drinks` in the drink shop dataset
- dropped unnecessary columns from the consumer dataset: `user_id`, `product_id`, `order_date`, `member`, and `social_touch`
- converted into JSON file

#### Consumer dataset
- **Rows:** `31800`
- **Unique brands:** `8`
- **Unique cities:** `16`
- **Unique product types:** `5`

| Statistic | Price | Quantity | Order Amount |
|---|---:|---:|---:|
| Count | 31800 | 31800 | 31800 |
| Mean | 21.37 | 2.00 | 42.86 |
| Std | 7.80 | 0.82 | 24.31 |
| Min | 8.00 | 1.00 | 8.00 |
| 25% | 14.58 | 1.00 | 24.06 |
| 50% | 21.32 | 2.00 | 35.19 |
| 75% | 28.11 | 3.00 | 59.42 |
| Max | 35.00 | 3.00 | 105.00 |

#### Shops dataset
- **Rows:** `1219`
- **Unique brands:** `1218`
- **Unique types:** `5`

| Statistic | Average Price | Number of Stores |
|---|---:|---:|
| Count | 1219 | 1219 |
| Mean | 21.35 | 161.06 |
| Std | 15.17 | 991.55 |
| Min | 3.00 | 1.00 |
| 25% | 13.65 | 6.00 |
| 50% | 17.00 | 19.00 |
| 75% | 22.45 | 58.50 |
| Max | 218.00 | 25095.00 |

### First insights
- The consumer dataset focuses on a small set of major brands.
- The shops dataset is much broader and covers a large number of brands.
- Only **5 brands** overlap between the two datasets, so the linkage plots should be interpreted carefully.
- The number of stores is highly skewed, with a few brands having very large store networks compared to the rest.

### Visualizations
We generated the following plots for the EDA:

- Top 10 brands by number of consumer orders
- Top 10 cities by number of consumer orders
- Top 10 brands by number of stores
- Average price vs number of stores
- Brand popularity vs number of stores
- Consumer paid price vs official brand average price

### Related work
### What others have already done with the data?
The first drink shop dataset has been previously explored in data visualization projects on the Heywhale platform (https://www.heywhale.com/mw/dataset/6595190fb96e5fc9eba7fd27/project). Existing work is relatively limited, mainly presenting basic statistics such as the top 100 drink shops by store count (via bar charts) and the distribution of average price tiers (via pie charts). As a result, the analytical perspective remains narrow, focusing primarily on basic brand-level attributes. These studies do not extend to multi-dimensional analysis of the market, such as examining consumer behavior, brand performance, or the relationships between brand characteristics and consumption data.

Moreover, prior projects rely on single-dimensional visualizations and do not integrate multiple datasets. In particular, they do not combine the consumption dataset with the drink shop brand information dataset (e.g., average price, number of stores, product types). They also overlook deeper insights related to consumer demographics (e.g., gender, age group), consumption patterns (e.g., scenarios, motivations), and the relationship between brand operation metrics (e.g., store count, pricing) and actual consumption performance (e.g., order amount, sales volume).

### Why is your approach original?
Our project offers an original approach through multi-dimensional analysis, cross-dataset integration, interactive visualization, and business-oriented insight mining, which greatly advances beyond existing single-dimensional work on the same dataset.
-	We carry out cross-dataset analysis by combining the drink shop brand dataset and the consumer order dataset, linked by brand and city. This integration allows us to explore relationships between brand attributes such as average price, store count, and product type, and real consumer behavior including spending, order amount, and preferences. Such combined analysis is absent in previous studies.
-	We design diverse and innovative visualizations instead of basic static charts. Our visualization system includes a word cloud where font size reflects store count, geographic heatmaps, box plots, dual-axis bar charts, scatter plots with trend lines, and stacked bar charts. The word cloud for store quantity is particularly original and intuitive compared with traditional bar charts.
-	Interactive design serves as another key contribution. Users can filter by city, brand, year, and price range, highlight specific groups, zoom into regions, and switch between metrics. This interactivity supports flexible, user-driven data exploration and significantly improves analytical depth compared with static visualizations in existing work.
-	We focus on actionable business insights rather than only descriptive statistics. Through correlation analysis, we explore meaningful questions such as how brand pricing relates to consumer spending, and who the core consumers are. These insights deliver practical value for understanding the Chinese drink shop market and exceed the scope of prior research.

### What source of inspiration do you take?
Our choice of topic is inspired by reports on the global bubble tea market, which highlight its rapid growth in recent years. As the birthplace of milk tea, China has developed a highly diverse beverage culture along with a vast number of drink shops, making this phenomenon particularly distinctive and worth exploring.

Our visualization design and analytical framework are further informed by professional data visualization practices in the retail and FMCG (Fast Moving Consumer Goods) industries, as presented on mainstream visualization platforms and in business reports. The main sources of inspiration are as follows:
-	Retail brand analysis on Tableau Public: Visualization cases on Tableau Public provide valuable references for multi-indicator brand comparison. These projects often employ dual-axis bar charts to compare metrics such as sales volume and revenue across brands, as well as scatter plots to analyze relationships between operational indicators and market performance. Drawing on these approaches, we design visualizations such as brand ranking charts and store count versus revenue scatter plots.
-	Word cloud visualization in marketing and social media analysis: Word clouds are widely used in brand marketing reports and social media analytics to represent attention or popularity through variations in font size. We adapt this technique to visualize beverage brand store counts, where font size reflects the number of stores. Compared with traditional bar charts, this approach makes leading brands more visually prominent and improves readability.
-	Geographic heatmaps in urban consumption studies: Urban consumption reports published by institutions such as China’s National Bureau of Statistics and consulting firms (e.g., McKinsey and Deloitte) frequently use geographic heatmaps to illustrate regional consumption patterns. This inspires our design of city-level consumption heatmaps, enabling a clear and professional representation of spatial consumption characteristics.

### Statement on Prior Dataset Exploration
This dataset has not been previously used by us in other courses or projects.

## Milestone 2 (17th April, 5pm)

**10% of the final grade**


## Milestone 3 (29th May, 5pm)

**80% of the final grade**


## Late policy

- < 24h: 80% of the grade for the milestone
- < 48h: 70% of the grade for the milestone

