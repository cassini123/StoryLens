# SceneSketch expert-rating results (P001–P025)

## Status and provenance

This analysis includes 25 participants (Scaffold: 15; Control: 10), six rated
tasks per participant, and four blind rating records per task (600 rows).
The current ratings are **independent AI-simulated expert-perspective ratings,
not verified submissions from the named human experts**. The numerical results
below are suitable for pipeline checking and provisional writing, but must not
be represented as human-expert evidence unless the ratings are replaced or
validated by the named experts.

## Analysis

For each outcome, the four ratings were first averaged within each
participant-task. The two tasks in each block were then averaged to produce one
Early, Middle, and Transfer score per participant. Thus, participants—not
raters or task rows—were the independent units. Scaffold change was defined as
Middle T2 minus Early T1; Control change was Middle T1 practice minus Early T1.
The difference-in-differences (DiD) was the difference between these two
participant-level changes. Transfer was compared between groups on T3.
Two-sided paired or Welch *t* tests and 95% confidence intervals are reported;
secondary dimensions are exploratory and are not multiplicity-adjusted.

## Paper-ready results text (Chinese)

四个评分记录在总体表达精确度上的一致性较高，
ICC(2,1) = .861，ICC(2,4) = .961；二元可重建判断的一致性同样较高，
Fleiss’ κ = .809。需要强调的是，这些数值来自当前的 AI 模拟专家视角评分，
不能直接表述为真人专家信度。

在主要结果 Overall Expression Precision 上，Scaffold 组由 Early 阶段的
5.13（SD = 1.12）上升至 Middle 阶段的 5.36（SD = 1.02），
平均变化为 0.23，95% CI [−0.39, 0.84]，
*t*(14) = 0.78，*p* = .449，*d*<sub>z</sub> = 0.20。
Control 组由 5.66（SD = 0.77）变化至 5.58（SD = 1.02），
平均变化为 −0.09，95% CI [−1.00, 0.82]，
*t*(9) = −0.22，*p* = .833，*d*<sub>z</sub> = −0.07。
两组变化量的净差（DiD）为 0.31，95% CI [−0.73, 1.36]，
Welch’s *t*(17.64) = 0.63，*p* = .536，Hedges’ *g* = 0.26。
因此，当前样本没有提供 Scaffold 在 Middle 阶段提高总体表达精确度的
统计证据；点估计方向为正，但置信区间较宽且跨越零。

在 Transfer T3 阶段，Scaffold 组总体表达精确度为
5.32（SD = 1.36），Control 组为 5.83（SD = 0.49）。
组间差为 −0.51，95% CI [−1.31, 0.30]，
Welch’s *t*(18.81) = −1.33，*p* = .201，Hedges’ *g* = −0.45。
该结果同样不支持 Scaffold 组在迁移任务中具有更高表达精确度。

各次级连续维度的 DiD 均未达到显著水平：
Visual Intent Interpretability 为 0.26，
95% CI [−0.73, 1.26]，*p* = .587，*g* = 0.22；
Spatial/Relational Specificity 为 0.56，
95% CI [−0.63, 1.76]，*p* = .339，*g* = 0.38；
Temporal/Action Specificity 为 −0.20，
95% CI [−1.20, 0.81]，*p* = .690，*g* = −0.15；
Executability/Reconstructability 为 0.29，
95% CI [−0.85, 1.42]，*p* = .601，*g* = 0.22。
二元 Reconstructable 的平均比例 DiD 为 0.10，
95% CI [−0.15, 0.35]，*p* = .404。

总体而言，当前 25 人样本中的点估计显示 Scaffold 组在空间具体性和总体
表达精确度上有小幅正向变化，但所有相关置信区间都跨越零。结果应被解释为
不确定，而不是“证明没有效果”；组别不平衡（15 vs. 10）和较宽置信区间
限制了可得结论。

## Figure 6

建议绘制带 95% CI 的两组折线点图，纵轴为 Overall Expression Precision
(1–7)，横轴依次为：

1. Early (T1)
2. Middle (Scaffold: T2; Control: T1 practice)
3. Transfer (T3)

作图数值：

| Group | Early mean [95% CI] | Middle mean [95% CI] | Transfer mean [95% CI] |
| --- | --- | --- | --- |
| Scaffold (n=15) | 5.13 [4.51, 5.76] | 5.36 [4.79, 5.92] | 5.32 [4.56, 6.07] |
| Control (n=10) | 5.66 [5.11, 6.21] | 5.58 [4.85, 6.30] | 5.83 [5.48, 6.17] |

使用点表示参与者层面的组均值，误差线表示参与者层面的 95% CI；不要把
600 条评分记录当作独立样本计算误差线。可在背景中叠加轻透明的参与者点，
但主图应突出组均值与置信区间。图注应明确 Middle 阶段两组接受的任务不同，
并报告 DiD = 0.31，95% CI [−0.73, 1.36]。

## Reproducible files

- `group_block_summary.csv`: all group/block means, SDs, and 95% CIs
- `participant_level_inference.csv`: paired changes, DiD, and transfer tests
- `participant_block_scores.csv`: analysis-unit values
- `interrater_reliability.csv`: ICC and Fleiss’ kappa
- `figure6_overall_precision.csv`: exact Figure 6 values
