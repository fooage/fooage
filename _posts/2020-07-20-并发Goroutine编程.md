---
layout: post
title: '并发Goroutine编程'
date: 2020-07-20 22:24:36 +0800
categories: Golang
---

在其他语言中需要自己维护的多线程切换在`Go`语言中在语言层面上就已经实现了线程之间的调度，而且内置了一种**应用层面的线程**比较轻量的线程可以很简单的创建，很简单的维护。所以多线程的能力是它有别于其他语言的一个重要的特征，多线程一定是重中之重。

## 理解协程

### 应用层线程

其他语言直接操作的是操作系统的线程，`OS线程`会被操作系统的内核来调度，而且比较重，通常消耗`2MB`的栈内存，而`Go`语言中内置了对线程的调度，它创建的线程是应用层面的，通过`Go`应用自身调度而非操作系统内核的调度，直接实现了应用层面的多任务切换。通常一个`goroutine`只占`2KB`的栈内存，所以调度方面实现的同时，降低了线程的消耗。

### 调度模型

`GPM`是`Go`语言的调度系统框架，分为了一下三个部分。

#### `Goroutine`

这个就代表了这种语言里面的线程，包含了线程本身的信息和调度的信息。

#### `Processor`

这个是调度的对象，负责调度线程和机器之间的关系。

#### `Machine`

对内核线程的封装，是真正运行线程的对象，线程在这上面运行。

## 多线程

### 使用线程

这里的使用线程主要指的是`goroutine`而不是系统的重线程，从应用层面上调度较轻的线程更快，开销更少。

#### 启动`goroutine`

启动`Go`线程的时候需要使用关键字`go`加上线程中执行的函数。

```go
go func() {
    for i := 0; i < 10; i++ {
        fmt.Println("Hello World!")
    }
}()
// 这里采用了匿名函数的方法启动线程
```

> 多线程的标识使得后面函数的返回值被忽略

#### 线程管理函数

-   `Goexit()`

可以直接结束当前线程的运行，但不会抛出`panic`异常。

-   `Gosched()`

暂停当前线程，使其他线程先行运算。只是暂停，不是挂起。

-   `GOMAXPROCS()`

这个比较常用而且重要，可以设置同时执行的逻辑`CPU`实际，默认和硬件的线程数一致。

```go
now := GOMAXPROCS(-1)
// 这样可以获得目前的逻辑处理器数量
```

### 并发和并行

首先强调的是**并发不等于并行**，前者是同时存在，后者是某一时刻同时运行多个，并发是并行的超集。

#### 并发

> 单核`CPU`，逻辑上同时执行

并发是指两种或两种以上的行为在系统中同时存在，至于这两个行为是否在某一时刻同时执行，在并发的概念中并不考虑。

#### 并行

> 多核`CPU`，物理机上的同时执行

这种常常是多`CPU`时实现的效果，很复杂，一般即使多处理器也会是让同多个个任务交给多个处理器处理，绝大多数时间都是切换线程太快来让人感觉上是并行，其实某一时刻一个`CPU`只能够处理一个指令也就是说只能处理一个事务。

## 线程通道

在`Go`语言中线程之间的通信依赖的是通道，通道作为`Go`语言中多线程不可或缺的一部分，它有很多细节的东西需要去了解。

-   通道的缓冲

通道的缓冲对于线程之间的通信很重要，有缓冲的通道主要用于通信，无缓冲的通道主要用于同步。

### 创建通道

使用`make`函数来给通道分配内存空间，通道的主要分为两大类，一种是无缓冲，一种有缓冲。缓冲区是为了防止阻塞而设立的，如果缓冲区已经装满，那么新的写操作就会被阻塞，直到缓冲区域重新有位置的时候才执行。根据实际情况创建。

#### 有缓冲

```go
// 有缓冲的通道一般是工作任务类
jobs := make(chan int, 10)
```

#### 无缓冲

```go
// 无缓冲的通道一般是通知类
done := make(chan bool)
```

### 使用通道

使用通道的方法有很多中，其中通道可以作为参数传递，这样通道就能够内嵌在线程中的函数里。通道还有一种多路复用的方法可以实时监听，多路任务处理这种方法提高了通道时间上的利用率，并且一定程度上防止了阻塞。

#### 基本运用

通道的基本操作就是读和写，缓冲区不够的时候就会阻塞。

```go
job := <-jobs
// 从通道中读取数据赋值给变量
```

```go
jobs <- job
// 将变量填入对应类型通道中
```

#### 作函数参数

作为函数参数就要区分下通道的类型了，通道有的只能读，有的只能写，有的能读能写。这些在函数参数的书写的时候都是可以定义的。

```go
func Work(jobs <-chan *job done chan<- bool) {}
// 这样就区分出了读写的通道
```

#### 多路复用

在平时一个线程可能会同时接受多个通道传来的值，这时候需要用到`select`语句从里面随机一个操作进行，来实现通道之间的协调，是类`Unix`系统中提供的**监听多个通道只要有一个可以读写，就不会阻塞**。

```go
select {
case data := <-ch1:
    // 操作
case data := <-ch2:
    // 操作
default:
    // 操作
}
```

用类似于`switch`的语法，随机从几个`case`中调用一个，而且可以在`case`后加上更加丰富的操作，不是按值判断，而是随机选取操作并执行。这也体现出了语言中的扇入的理念，把多个通道合并操作。

#### 通知退出机制

关闭由`select`监听的其中一个通道会被立即感知，然后可以进行相应的操作，这就实现了**通知退出机制**。这样可以实现较简单的反馈，之后可以使用`context`包中的复杂的通知机制。当标识通道有元素的时候的时候，`select`会立马感知出来并执行相应的语句，起到通知另一个操作的作用。

```go
var done chan struct{} // 用空
func random(done chan struct{}) chan int {
	ch := make(chan int, 10)
label:
	for {
		num, _ := rand.Int()
		select {
		case ch <- num:
		case <-done:
			break label // 跳出所包含的代码段
		}
	}
	return ch
}
func main() {
	done := make(chan struct{}, 1)
	ch := random(done)
	// 向通知通道中填入数据
	done <- struct{}{}
	close(done)
}
```

### 细节问题

#### 通道的错误

> 向已经关闭的通道写数据会报错
>
> 重复关闭通道会报错

#### 通道的阻塞

> 向未初始化内存的通道读写会使当前线程**永久阻塞**
>
> 向缓冲区满的通道写存数据会阻塞线程
>
> 通道中没有数据读取则会阻塞线程

**应该注意的是，阻塞很正常，只是一种等待，但是永久阻塞就会使线程报废。**

#### 通道的非阻塞

> 读取已经关闭的的通道会返回零值，不会阻塞
>
> 未满的通道读写不会阻塞

## 并发范式

有很多固定的很优秀的并发编程的范式可以去借鉴，掌握了范式就相当于站在了巨人的肩膀上。

### 生成器

生成器顾名思义是用来生成全局的事务的，生成之后通过通道给不同的`worker`线程来处理这些问题。

```go
// 多线程生成器
func GeneratorIntA(done chan struct{}) chan int {
	ch := make(chan int, 10)
	go func() {
	label:
		for {
			// 通过监听一个信号来确定是否停止生成
			select {
			case ch <- rand.Int():
			case <-done:
				break label
			}
		}
		close(ch)
	}()
	return ch
}
func GeneratorIntB(done chan struct{}) chan int {
	ch := make(chan int, 10)
	go func() {
	label:
		for {
			// 通过监听一个信号来确定是否停止生成
			select {
			case ch <- rand.Int():
			case <-done:
				break label
			}
		}
		close(ch)
	}()
	return ch
}
// 总生成器来用多路复用来增加生成器源
func GeneratorInt(done chan struct{}) chan int {
	ch := make(chan int, 20)
	go func() {
	Label:
		for {
			select {
			case ch <- <-GeneratorIntA(done):
			case ch <- <-GeneratorIntB(done):
			case <-done:
				break Label
			}
		}
		close(ch)
	}()
	return ch
}
func main() {
	// 创建一个作为接收退出信号的通道
	done := make(chan struct{})
	// 启动生成器
	ch := GeneratorInt(done)
	// 获取生成器资源
	for i := 0; i < 10; i++ {
		fmt.Println(<-ch)
	}
	// 通知生成者停止生产
	done <- struct{}{}
	fmt.Println("stop generator")
}
```

### 管道

如果一个函数的输入输出都是通过同类型通道来实现的，那么它调用自己就可以形成一个**调用链**，如果有多个相同参数类型的函数也能组成**调用链**。

```go
// 函数的功能是将通道内的数据统一加一
func Chain(in chan int) chan int {
	out := make(chan int)
	go func() {
		for v := range in {
			out <- v + 1
		}
		close(out)
	}()
	return out
}
func main() {
	in := make(chan int)
	// 初始化输入参数
	go func() {
		for i := 0; i < 10; i++ {
			in <- i
		}
		close(in)
	}()
	// 连续调用三次
	out := Chain(Chain(Chain(in)))
	for v := range out {
		fmt.Println(v)
	}
}
```

### 一对一处理

当收到一个任务的时候就开启一个`goroutine`来处理这类业务，当少量并发的时候就很好用且思路简单。比如对于少流量网站的`Web`服务器来应答请求的时候，一个请求就可以开启一个线程。

```go
// 服务器处理请求函数
func HandleFunc(conn *net.TCPConn) {
	defer conn.Close()
	for {
		buf := make([]byte, 256)
		cnt, err := conn.Read(buf)
		if err != nil {
			return
		}
	}
}
// 服务端主要逻辑
func main() {
	localAddr, err := net.ResolveTCPAddr("tcp", "192.168.124.4:8090")
	if err != nil {
		return
	}
	listener, err := net.ListenTCP("tcp", localAddr)
	if err != nil {
		return
	}
	for {
		conn, err := listener.AcceptTCP()
		if err != nil {
			return
		}
		// 启动线程处理连接请求
		go HandleFunc(conn)
	}
}
```

### 工作协程池

线程并不是随意开启的，虽然`Go`中的线程是很轻量的线程，但是还是需要加以限制。所以我们只需要根据运行平台的情况来处理线程池的开辟，构成一个工作池来用固定数量的线程处理问题。下面的例子只是最简单的情况，还可以加上通知通道来控制线程的结束。

```go
// 工作任务结构体
type Task struct {
	ID      int
	randnum int
}
// 处理结果结构体
type Result struct {
	task   Task
	result int
}
var tasks = make(chan Task, 10)
var results = make(chan Result, 10)
// 运算任务
func Process(num int) int {
	sum := 0
	for num != 0 {
		digit := num % 10
		sum += digit
		num /= 10
	}
	return sum
}
func Worker(wg *WaitGroup) {
	defer wg.Done()
	// 不断地从任务中读取新的任务处理
	for task := range tasks {
		result := Result{task, Process(task.randnum)}
		results <- result
	}
}
func CreateWorkerPool(number int) {
	var wg sync.WaitGroup
	// 构造出多个工作者来处理任务
	for i := 0; i < number; i++ {
		wg.Add(1)
		go worker(&wg)
	}
	wg.Wait()
	close(results)
}
```

### `future`模式

当一个任务的多个子任务没有依赖关系，那么开启直接子任务的时候就可以利用并发来完成，而不是链式的完成这些任务。比如在用户注册后，我们需要发送邮件和短信。

```go
// 一个查询结构体
type query struct {
	sql    chan string
	result chan string
}
// 执行查询操作
func ExecQuery(q query) {
	// 启动协程
	go func() {
		// 获取输入
		sql := <-q.sql
		q.result <- "result from " + sql
	}()
}
func main() {
	q := query{make(chan string, 1), make(chan string, 1)}
	go ExecQuery(q)
	// 发送参数
	q.sql <- "slect * from table"
	// 获取结果
	fmt.Println(<-q.result)
}
```
