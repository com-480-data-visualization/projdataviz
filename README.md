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


> - What others have already done with the data?
> - Why is your approach original?
> - What source of inspiration do you take? Visualizations that you found on other websites or magazines (might be unrelated to your data).
> - In case you are using a dataset that you have already explored in another context (ML or ADA course, semester project...), you are required to share the report of that work to outline the differences with the submission for this class.

## Milestone 2 (17th April, 5pm)

**10% of the final grade**


## Milestone 3 (29th May, 5pm)

**80% of the final grade**


## Late policy

- < 24h: 80% of the grade for the milestone
- < 48h: 70% of the grade for the milestone

