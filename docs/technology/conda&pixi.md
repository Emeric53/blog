# Python 个人项目与环境管理

在我个人的科研和项目任务中，python 算是最主要使用的一门编程语言。其实在最开始为什么要使用这门语言，这门语言有什么特别和优势呢，我都一概不知，就知道大家都这么用，语法也不是那么难。对于现在的科学界来说，Python 确实算是一门好用且算全能的语言实现。我个人而言呢，本科时期还不懂的时候，对 python 的包安装啊，环境管理啊，版本控制啊，这些内容都不太懂。遇到一些坑，也慢慢摸索了一些基本用法和背后的原理。

今天想写一个简单的博客，介绍一下我现在主要使用的两个 python 环境管理工具，conda 和 pixi。其中 pixi 是最近刚刚了解到的一个工具，缘因是今年有点成为 hype 的另一个由 rust 实现的 python 环境管理工具 uv 的兴起，但是在简单实用了一下以后，觉得这个环境管理工具并不合适我的使用场景，特别是我需要使用一些地理数据处理和大气科学相关的 python 包，这些包有很多底层都利用到了 c++ 等语言，uv这种纯python管理工具难以处理这些依赖关系，而 pixi 就像是 uv 在这个使用场景的一个替身。

## conda
出于项目管理和环境隔离的需要，我想大家在使用 python 的初期都有被教育要使用虚拟环境，不同的虚拟环境安装不同版本的python,对应版本的各种包，这样不容易把环境“弄坏”。能实现这个需求的工具其实特别多，比如 python 自带的 venv，或者 anaconda 公司推出的 conda，或者还有例如 poetry 等工具。用什么其实不关键，好用能用好，解决问题才是王道。

conda 是 anaconda 公司推出的一个虚拟环境管理与包下载器，连带着他们公司负责维护的一套 python 的包仓库以及对应的依赖关系。安装 conda 版本的python 有几个好处，一是自带很多基础的科学计算的包，二是使用 conda 命令安装包时，会自动处理依赖关系。还有其他什么好处我暂时也懒得去查或者一一列举。

但是总有人喜欢乱说 conda 是收费的，anaconda 公司作恶，我不这么觉得。首先 anaconda 公司确实在前几年有这么一项说明，使用 conda 进行 python 包的安装时，如果使用者处在一个超过50人还是200人的公司（不管别人用不用），同时使用的是 default channel,也就是 anaconda 公司维护的包仓库，那么 anaconda 公司会要求使用者支付年费。我觉得这是一个不过分甚至合理的要求，包仓库的托管和维护都需要很多的财力和人力，而 conda 这个工具本身是开源免费的。

那么有什么好方法避免这个问题呢？甚至不只是说避免这个问题了，conda-forge 这个社区维护的包仓库，在科研领域，其实相比 anaconda 公司的官方包渠道来说甚至更好用，更新更快包更全，而且换上这个 channel,也就能避免收费的问题了。解决方案很简单，也就是在使用conda命令的时候，改成 'conda install -c conda forge 包名称' 问题就解决了。但是每次都要显式说明使用的 channel,也有点烦来的。

接下来，介绍一下 miniforge 这个 conda 发行版，它默认只使用 conda-forge 这个 channel，同时内部还包括了 mamba 这个重写的 conda 管理器，后面的命令完全一样，只要把 conda 换成 mamba 就行了，mamba 的速度会快很多，下载多个包的时候能实现并行下载和更好的进度条提示。此外，miniforge 很克制，不会安装很多有的没的的包，直接给你硬盘干满（说的就是 anaconda 版本的 conda, 安装环境的时候，会打包很多并不一定要用的包），默认安装的就是最小的环境。

### miniforge 安装
安装的方式很简单，我想简单区分为 windows 与 Linux/macOS 两种。

插点题外话，能不用 windows 就不用 windows吧，我觉得任何一个 linux 发行版或者 macOS 在编程环境处理和安装上都比 windows 来的方便稳定很多。

安装很简单，前往 miniforge的 github 主页 [https://github.com/conda-forge/miniforge]，去 releases 页面找到对应的安装器就行，windows 版本通常是一个 .exe 文件，安装流程比较简单，Linux/macOS 版本则是一个 .sh 文件，需要有一定的命令行工具使用基础（感觉得有）。

### miniforge 使用
接下来简单介绍一下 miniforge 的使用方法，我觉得没意思，就简单说说我的使用流程。

新环境安装，`conda create -n 环境名称 python=版本号`，想要创建的时候顺带安装几个包，就在后面加上包名称就行，多个包用空格隔开。

环境激活，这个很重要，默认不要对 base 环境做改动，这个 base 环境其实就是一个 python 环境里面加了 conda 这个包。conda 其实底层是用 python 写的一个工具，base 环境就是让你能调用这个工具的，个人建议不要动 base 环境，不要安装别的包。使用某个虚拟环境前，使用 `conda activate` 环境名称激活环境，使用 `conda deactivate` 回到 base 环境。

之后需要添加包，使用 `conda install 包名称`，现在这个命令里面是隐含了 `-c conda-forge` 的。如果包不在 conda-forge channel，可以使用 `conda install -c channel_name` 指定 channel，例如 huggingface 等其他的 channel。

环境的导出和导入，建议做好，一是能做这个环境的备份，不会换电脑就不知道怎么办，还得费劲重新配置。二是在当前代码库倡导开源的今天，论文发表以后提交代码仓库时，不给出这样一份环境配置文件，别人也不一定能复现。最简单的用法就是 `conda env export > environment.yml`，导出为一个 yml 配置文件，然后别人就能用这个文件 `conda env create -f environment`.yml 来创建环境了，-f 是指使用本地文件来创建。

其他还有很多命令都是和默认版本的 conda 一致的，这里就不展开介绍了，有疑问建议 google 一下官方文档或者借助 LLM 工具。然后我建议的一个用法是，激活环境的时候使用 conda 命令，后续的所有操作，都可以把 conda 换成 mamba,这样速度会快很多。

conda 部分的内容到此结束。

## pixi
接下来，我想介绍一下写这篇博客的出发点，也就是 pixi 这个我才发现不久的命令行工具，在这个工具的项目官网上简单了解了以后，我发现，这个工具有着和 uv 类似的用法和定位，不像 conda 或者其他的虚拟环境管理工具，都是面向一个 python 环境开展的，同一个项目可以使用不同的虚拟环境， 一个虚拟环境也可以复用在不同的项目上。而接下来要介绍的 pixi 和 更出名的 uv,则是面向项目的管理工具，在一个具体的，活生生的开发项目中，通过两个配置文件，来完美控制这个项目需要的环境和安装的包以及自带的依赖。我认为和 conda 这种工具是完全不一样的思路，适合一些非常正式，适合长久迭代更新或未来要托付给他人交接的中型或大型项目，我也刚尝试这个工具的使用，很多细节和特殊用法还在尝试和拓展阶段。

为什么会尝试使用 pixi 呢，之前 uv 很火的时候我尝试了，但是认清了这个工具没办法满足我的需求，哪怕它项目管理很好用，能完美复现环境，下载包也很快。但是我目前的工作流就是要很大程度上基于 conda 这套体系下的包。而 pixi 就是面向这个需求开发的，它能很好的作为 conda 和 pip 的桥梁，一次性满足这两个渠道进行 python 包安装的需求和依赖同步处理与管理。而 pixi 的主要命令和配置管理方式又和 uv 比较类似。因此，我决定尝试使用一下这个工具，探索一下能否更好的帮助我进行项目管理。

说明一下，根据 pixi 的版本号 v0.6*，可以认为这个工具目前还在开发阶段，还没有发布第一个完整版？或者正式版？我看 changelog 更新挺频繁的，可以尝鲜使用，反正应该不会弄坏你电脑就是了。

### pixi 安装
前往 pixi 工具的官方网站，在 Installation 页面能看到安装的说明，也是更多建议直接在命令行里进行安装。
对于 Linux 和 macOS，使用命令
```bash
curl -fsSL https://pixi.sh/install.sh | sh
```
如果没有 curl,也可以使用 wget 工具，命令如下
```bash
wget -qO- https://pixi.sh/install.sh | sh
```
而 windows 用户则可以下载安装器，应该也是一个.exe 可执行文件，或者也使用命令行完成下载
```powershell
powershell -ExecutionPolicy Bypass -c "irm -useb https://pixi.sh/install.ps1 | iex"
```
安装完以后，可以通过在命令行输入 `pixi --version` 来确认是否安装成功，正常情况会输出 pixi 的版本号。
后续需要更新 pixi 的版本，使用 `pixi self-udpate` 命令。

### pixi 功能和特点介绍
官网自己是这么介绍的，pixi 是一个适合不同背景开发者的快速，现代，可复现的包管理工具。这个工具支持多平台，能构建多环境，能创建 tasks 执行一些复杂的命令行 pipelines。能作为全局安装工具，代替 apt，homebrew 等包管理器（你随便说，我能换算你赢）。

pixi 的一大特点我认为是基于 conda 软件生态包为导向进行开发。conda-forge 上大量的适合不同平台的软件包，我认为是 pixi 的一大基础，也是我愿意尝试 pixi 的主要原因。然后 pixi 多编程语言支持，环境管理和包下载快速（对标 uv），用户友好这些特点，有些些感知。

### pixi 简单用法

我要从头开始介绍一下 pixi 的使用方式和特别用法，主要介绍一下简单的基本语法和配置文件调配。因为 pixi 不是面向环境的，而是面向项目的，所以最开始两个使用方式：
1. 面对一张白纸，创建一个新项目并直接使用 pixi 进行管理。
2. 一个已经有内容的代码项目，使用 pixi 来管理它。

两种方式没什么区别，都是通过 `pixi init 项目文件夹名称`来进行初始化，init 也就是 initiate 的缩写，很多命令去探究一下英文词的全称，也就很好理解和记忆了，如果是旧项目，就不用指明文件夹名称了。

初始化完成后，文件夹中会出现一个 pixi.toml 配置文件以及两个 git 相关文件。pixi.toml 更像是一个项目与环境的总览清单，里面点名了工作环境，支持的平台，当前需要的依赖，以及添加的一些特别任务。

以下是我使用 pixi 创建一个名为 pixi 的新项目后的 pixi.toml 的内容

```
[workspace]
authors = ["Liang Menglei <82796664+Emeric53@users.noreply.github.com>"]
channels = ["conda-forge"]
name = "pixi"
platforms = ["linux-64"]
version = "0.1.0"

[tasks]

[dependencies]
```

其中 workspace 里面记录了该项目的作者，使用的 channels 默认为 conda-forge, 项目名称为 pixi, 目前使用的平台是 linux-64, 版本号为 0.1.0。这里我补充一点，如果你的项目有可能多操作平台上使用的可能性，可以在初始化后，就在 platforms 字典内添加相应的平台，例如 `platforms = ["win-64", "linux-64", "osx-64", "osx-arm64"]`，名称一目了然，其中 osx-64 是指之前使用 intel 芯片的老 Mac, osx-arm64 是 2020 年后 使用 Apple silicon M series 芯片的 Mac 电脑。这样后续添加各种依赖时，会一起解析不同平台上的依赖，实现真正完美的环境复现。 

接下来安装包的用法真的很简单，也很好记。`pixi add python=3.12` 可以指定这个项目需要的 python 环境，`pixi add 包名称1 包名称2` 就能从 conda-forge 渠道来实现这些包的下载，如果是一些搭载在 pypi 渠道的，也就是常规上是使用 `pip install` 的包，例如 `torch`或 meta 的`transformers`等，则改为`pixi add --pypi 包名称`就行。pixi 会自己解析当前环境已有包和要安装包之间的依赖关系，并创建或者修改补充一个名为 pixi.lock 的文件，该文件内记录了详细的该环境中安装的包，渠道，安装路径，依赖等等信息，之后将这些包安装到当前环境中。

举例，将 `numpy` `pytest`添加到当前工作环境中。
```
pixi add numpy pytest
```
之后，该项目文件夹中多了 pixi.lock 锁文件，同时 pixi.toml 内容存在如下变动
```
[dependencies]
numpy = ">=2.4.0,<3"
pytest = ">=9.0.2,<10"
```
你也可以在 add 的时候指定特定包的版本。
```
pixi add numpy==2.2.6
```

类似的，从非 conda 渠道而是 pypi 安装的包，命令类似，但需要添加 `--pypi` 这样一个 flag。
```
pixi add --pypi httpx
```
之后 pixi.toml 存在如下变动
```
[pypi-dependencies]
httpx = ">=0.28.1, <0.29"
```

接下来来简单看看 pixi.lock 中的内容
```
ersion: 6
environments:
  default:
    channels:
    - url: https://conda.anaconda.org/conda-forge/
    indexes:
    - https://pypi.org/simple
    options:
      pypi-prerelease-mode: if-necessary-or-explicit
    packages:
      linux-64:
      - conda: https://conda.anaconda.org/conda-forge/linux-64/_libgcc_mutex-0.1-conda_forge.tar.bz2
      - conda: https://conda.anaconda.org/conda-forge/linux-64/_openmp_mutex-4.5-2_gnu.tar.bz2
      - conda: https://conda.anaconda.org/conda-forge/linux-64/bzip2-1.0.8-hda65f42_8.conda
      .
      .
      .
      - pypi: https://files.pythonhosted.org/packages/7f/9c/36c5c37947ebfb8c7f22e0eb6e4d188ee2d53aa3880f3f2744fb894f0cb1/anyio-4.12.0-py3-none-any.whl
      - pypi: https://files.pythonhosted.org/packages/70/7d/9bc192684cea499815ff478dfcdc13835ddf401365057044fb721ec6bddb/certifi-2025.11.12-py3-none-any.whl
      - pypi: https://files.pythonhosted.org/packages/04/4b/29cac41a4d98d144bf5f6d33995617b185d14b22401f75ca86f384e87ff1/h11-0.16.0-py3-none-any.whl
packages:
- conda: https://conda.anaconda.org/conda-forge/linux-64/_libgcc_mutex-0.1-conda_forge.tar.bz2
  sha256: fe51de6107f9edc7aa4f786a70f4a883943bc9d39b3bb7307c04c41410990726
  md5: d7c89558ba9fa0495403155b64376d81
  license: None
  purls: []
  size: 2562
  timestamp: 1578324546067
.
.
.
- pypi: https://files.pythonhosted.org/packages/7f/9c/36c5c37947ebfb8c7f22e0eb6e4d188ee2d53aa3880f3f2744fb894f0cb1/anyio-4.12.0-py3-none-any.whl
  name: anyio
  version: 4.12.0
  sha256: dad2376a628f98eeca4881fc56cd06affd18f659b17a747d3ff0307ced94b1bb
  requires_dist:
  - exceptiongroup>=1.0.2 ; python_full_version < '3.11'
  - idna>=2.8
  - typing-extensions>=4.5 ; python_full_version < '3.13'
  - trio>=0.32.0 ; python_full_version >= '3.10' and extra == 'trio'
  - trio>=0.31.0 ; python_full_version < '3.10' and extra == 'trio'
  requires_python: '>=3.9'
.
.
.
```
里面就是很详细的记录了这个环境中安装的包，来自的渠道，以及在那个渠道中的位置，版本号，sha256 哈希值，依赖关系字典等等信息，有了这个lock文件，就能轻松实现不同平台不同电脑上的环境完美复现。

同时，在添加依赖之后，环境中也会出现一个.pixi 的隐藏文件夹，里面就是你这个项目的 python 环境以及安装的依赖，需要说明的是，如果没有通过 `pixi add python=3.*`来指定具体的 python 版本，使用的会是 pixi 默认的，比较新的 python 版本。此外，不同的 python 版本在第一次安装的时候都需要进行下载，不同的包在初次安装的时候也需要下载，需要等待一段时间。但是一旦安装完成后，通过 pixi 创建另一个项目，使用同一个 python 版本的时候，或者添加同样的包的时候，速度就会明显快很多。这是因为 pixi 创建的环境其实都是采用硬链接的方式指向一个中心文件夹中的文件，这个文件夹中存放了你创建的不同版本的 python 以及各种包，初次遇到需要下载，之后需要就通过创建硬链接的方式指向对应的文件，一下就配置好了。

配置好 pixi 的环境后，如何调用对应的环境呢？像 conda 是需要 `conda activate 环境名`，而 pixi 则是 
```
pixi run python python文件.py
# or:
pixi shell
python python文件.py
```
其中 `pixi shell`就是类似 `conda activate 环境名` 这样的操作，指定当前 shell 的 python 命令指向当前项目的 pixi python环境的解释器路径。

在 IDE 中的使用，其他平台我没有进行测试，VS Code 以及基于开源 VS Code 的一众编译器，都可以通过安装 pixi 的插件来实现 pixi 环境的自动识别，直接找到该项目文件夹中的 default 环境，之后只用点击 IDE 中的运行就能使用 pixi 创建和管理的 python 环境进行运行了。

### conda 迁移与 他人完美复现
之前我的 python 环境都是用 conda 进行管理的，如果要从头开始一个一个使用 pixi 重新管理，那我想是非常头痛的，有什么好方法吗？
有的

首先，使用 conda 将之前某个环境的配置文件进行导出，
```
# 激活环境
conda activate my_env

# 导出环境配置
conda env export > environment.yml
```

之后，使用 pixi 进行初始化，并导入这个环境配置
```
# 注意要在你这个项目目录下运行
pixi init --import environment.yml
```
这样 pixi 就会快速在当前目录生成 pixi.toml 这个项目的配置文件,以及 pixi.lock 这个最重要的环境复原锁文件。

之后，使用`pixi install` 或者直接 `pixi run python 项目中的某个python文件.py`，pixi就会开始基于配置文件和锁文件配置环境，并运行代码。

如果需要将该项目的环境在另一台机器上完美复现，需要做的也就是在安装了 pixi 的基础上，将 pixi.toml 以及 pixi.lock 这两个文件给别人，然后同时使用`pixi install` 或者直接 `pixi run python 项目中的某个python文件.py` 就能实现环境的完美复制了，其中要注意先前提到的 pixi.toml 配置文件的 platforms 支持问题，添加多平台会影响一定的包与依赖解析速度，但能确保不同操作平台上环境的正确复现，要添加的话要在项目创建初期就添加上，不添加应该也能基本完美复现。

## 总结
今天大致介绍了一下目前我的 python 个人项目和环境管理方式与工具，我还在对 pixi 进行持续的探索，特别是单项目多环境支持以及 tasks 的用法，有了更多心得与体会之后再做分享。

未来我应该会 conda 与 pixi 进行结合使用，面对一些快速简单的基本代码处理和小任务的完成，我应该会用我之前安装好必要包的 conda 环境进行处理，而面对较大，略复杂的，同时可能未来会上传 github 或者分享给他人的项目，使用 pixi 进行管理尝试。