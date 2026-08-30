# Agentic coding

从去年年底开始，Claude Code skills 在 X 平台上的讨论热度就非常高，都是在说多颠覆性多能提高生产力。受限于我的 Claude 账号早就被官方封禁了，我也一直没去尝试使用。最近知道了有工具能够跳过 Claude Code 的登陆验证这一步，并使用其他平台的 API 进行注入，也算是用上了 Claude Code 这一工具。

## CLI or IDE

忘记这三个工具具体发布的时间了，我印象中是 Claude Code 先出，然后是 openai 公司的 CodeX，之后是谷歌出的 Gemini CLI。当初我只用了 Gemini CLI，因为对我来说使用门槛最低，模型的能力我也认可。但是终究还是不太习惯在终端内部完成各种任务，首先是我在终端中丧失了对项目内容，文件结构的快速了解；其次是不太能直观看到代码的内容，也没有使用鼠标时的熟悉和从容。这当然是我的一部分问题，我之前一直很想好好掌握 vim 和各种终端命令行的使用，现在的熟练度只能说相比常规 IDE 加键鼠差得远了。所以这三个工具基本都是只知道而没有深入用过。

目前来说，还是习惯了 IDE + LLM 这套模式了。不过我也想清楚了，用什么技术流不用太纠结，能否完成事情对我这个人来说应该是更需要看重的事情，我大可以放过内心的思索就先这样吧。

## Antigravity
最近用的最多的 agentic ide应该就属 google 于 2025 年 11 月推出的 Google Antigravity 了。目前的公测阶段，各个模型都还是免费提供使用额度的，同时是基于 VS Code 进行改动的，操作和使用习惯转换的成本几乎为零。

用反重力或者 cursor 的好处是什么呢？如何更好的使用呢？我现在有一点点自己的看法。像侧边栏插件进行直接对话，代码编写和执行，以及项目文件默认可以作为 context 或者通过 mention 的方式显式指明这些基本的点我就不想赘述了。这些都是开箱即用的好处。我最近发觉，agent 如何更精准更高质量更少迭代次数更高效的完成任务，其中的学问还是不少的。

我感觉不同公司推出的 code agent 配置和结构上应该是有区别的，但是总体的逻辑应该都大差不差。我个人对现在 LLM 赋能个人代码项目的理解是：瓶颈和短板不在于大模型的生成能力，而是大模型对需求，数据和输出结构的了解程度，个人对 LLM 生成的多代码文件的了解程度和审阅与指导。所以并不是说程序员会被 AI 取代，或者程序员之间失去了差异。反而传统中软件工程中的很多理解和思路都需要被进一步运用，让 LLM 生成更让人满意，更准确满足需求的代码。国内外模型能力上的差异在我看来也可以先放一放，context engineering 确实也是非常重要的一个影响因素。

以 Google Antigravity 为例吧，我们能对 agent 做的调整有 rules workflows skills。我认为目前来说这三者的重要性排序应该是 rules 大于 skills 大于 workflows。这三项也都分别存在全局和项目专用两大类，全局是放在 Antigravity根目录下的配置文件，无关项目，类似宪法或者通识，而项目专用的则存在在当前项目的一个隐藏文件夹　`.agent/`　中，更适合那些要针对这个项目的一些特定的更细化的规则和指导。

rules 是用来约束 agent 行为的准则，通过设定项目的 rules 可以默认修正 agent 可能发生的很多不符合你预期的行为发生，你可以在 rules 中说明要使用的技术栈，代码的风格，函数和类的说明等等。以我自己为例，以下是我个人 rules 的子标题:

```
## 1. 语言与沟通 (Language & Communication)

## 2. 核心原则 (Core Principles / Laws)

## 3. 代码规范 (Code Style)

## 4. 数学符号真值 (Source of Truth)

## 5. 工程化规范 (Engineering Standards)

## 6. 会话与任务管理 (Session & Task Management)
```
rules 的构建可以从粗粒度的大方向出发，慢慢基于在与 agent 交互和对话的过程中总结出他容易犯的问题，并结合 LLM 逐步优化全局和项目的 rules 内容。

workflows 我也没用出来什么特别的，在我看来这个功能和 shell 文件进行重复性标准化流程实现没太大区别？

skills 则是最近 Antigravity 新增加的功能，毕竟 Claude Code skills 热度很高，不抄说不过去。skills 其实就是一系列任务的封装，用来完成某个稍微复杂且具备多样性的一件事情。举例来说，可以是一个代码测试 skill，或者绘图 skill。skill 的总体配置包括一个skill 内容的说明 markdown 格式文档，也可以附带一些代码文件和模板文件等。网上现在有很多很多已有 skills 的仓库，可以看看实现的功能是否需要来直接使用，也可以借鉴别人的写法和组织形式，慢慢构建特化自己需求的 skills，我想随着慢慢的积累和优化，这项拓展功能是能优化人的工作流，提高工作效率的。

## 推荐阅读

这里只放两个我认为最有价值的官方资源：

> 🔗 **Cursor Blog: Agent Best Practices**
> [https://cursor.com/blog/agent-best-practices](https://cursor.com/blog/agent-best-practices)
> *推荐理由：Cursor 官方对于 Agent 开发落地的最佳实践总结。*

> 🔗 **Google Antigravity Documentation**
> [https://antigravity.google/docs/agent](https://antigravity.google/docs/agent)
> *推荐理由：来自 Google 的权威文档，系统性强。*