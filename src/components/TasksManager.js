import React, { useRef } from "react";
import FetchDataAPI from "../providers/FetchDataAPI";
import viewportAdjust from "./viewportAdjust";
import importAllSVG from "../utilities/helpers";

const svgList = importAllSVG();

class TasksManager extends React.Component {
  state = {
    tasks: [],
    taskName: "",
    isTaskFormShown: false,
    TaskFormScrollHeight: null,
  };

  constructor(props) {
    super(props);
    this.fetchDataAPI = new FetchDataAPI();
    this.intervalIDList = [];
    this.defaultTaskName = "New Task";
    this.taskFormInputRef = React.createRef();
  }

  putNameToState = (evt) => {
    const { value } = evt.target;
    const newTaskName = value;
    this.setState({ taskName: newTaskName });

    this.increaseSpaceOfTaskForm(evt);
  };

  increaseSpaceOfTaskForm(evt) {
    const input = evt.target;
    const { scrollHeight } = input;

    if (input.value.length > 5) {
      this.setState({ TaskFormScrollHeight: scrollHeight });
    } else {
      this.setState({ TaskFormScrollHeight: 100 });
    }
  }

  async handleTaskSubmit(evt) {
    evt.preventDefault();
    const { taskName } = this.state;
    const { fetchDataAPI, defaultTaskName } = this;

    const task = {
      name: taskName.length === 0 ? defaultTaskName : taskName,
      time: {
        start: 0,
        current: 0,
        total: 0,
      },
      isRunning: false,
      isDone: false,
      isRemoved: false,
    };

    await fetchDataAPI.postData(task);
    const data = await fetchDataAPI.fetchData();
    const newTask = data[data.length - 1];
    const copyTasks = this.createDeepCopy(this.state.tasks);
    copyTasks.push(newTask);
    this.setState({ tasks: copyTasks });

    this.resetTaskForm();
    this.scrolltoTheBeginning();
  }

  async componentDidMount() {
    const data = await this.fetchDataAPI.fetchData();
    this.setState({ tasks: data });

    viewportAdjust();

    this.informUserOfRunningTask();
  }

  informUserOfRunningTask() {
    window.addEventListener("beforeunload", (evt) => {
      const { tasks } = this.state;
      if (tasks.some((item) => item.isRunning === true)) {
        evt.preventDefault();
        evt.returnValue = true;
      }
    });
  }

  renderTask() {
    const { tasks } = this.state;
    const tasksCopy = this.createDeepCopy(tasks);

    return tasksCopy.reverse().map((item) => {
      if (item.isRemoved || item.isDone) {
        return;
      }

      return <>{this.TaskTemplate(item)}</>;
    });
  }

  renderTaskDone() {
    const { tasks } = this.state;
    const tasksCopy = this.createDeepCopy(tasks);

    return tasksCopy.reverse().map((item) => {
      if (item.isRemoved || !item.isDone) {
        return;
      }

      return <>{this.TaskDoneTemplate(item)}</>;
    });
  }

  resetTaskForm() {
    const newTaskName = "";
    this.setState({ isTaskFormShown: false, taskName: newTaskName });
  }

  scrolltoTheBeginning() {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  displayTaskForm() {
    this.setState({ isTaskFormShown: true });
  }

  inputTaskFormValue = (evt) => {
    const { taskName } = this.state;
    evt.target.value = taskName;
  };

  defaultTaskFormValue = (evt) => {
    const { taskName } = this.state;
    const { defaultTaskName } = this;

    if (evt) {
      if (taskName.length === 0) {
        evt.target.value = defaultTaskName;
      }
      return;
    }

    if (document.activeElement !== this.taskFormInputRef.current) {
      return defaultTaskName;
    }
  };

  turnOffScrolling() {
    const body = document.querySelector("body");
    body.classList.add("no-scroll");
  }

  turnOnScrolling() {
    const body = document.querySelector("body");
    body.classList.remove("no-scroll");
  }

  NewTask() {
    const { isTaskFormShown } = this.state;

    if (isTaskFormShown) {
      this.turnOffScrolling();
      return (
        <>
          <section className="addTask addTask--hidden">{this.BtnAdd()}</section>
          ;
          <section className="newTask">
            <div className="newTask__container">{this.TaskForm()}</div>
          </section>
        </>
      );
    } else {
      this.turnOnScrolling();
      return <section className="addTask">{this.BtnAdd()}</section>;
    }
  }

  TaskForm() {
    return (
      <form className="taskForm" onSubmit={this.handleTaskSubmit.bind(this)}>
        {this.BtnFormRemove()}
        <textarea
          ref = {this.taskFormInputRef}
          className="taskForm__input"
          name="taskName"
          id="taskName"
          style={{
            height: this.state.TaskFormScrollHeight,
          }}
          value={this.defaultTaskFormValue()}
          onFocus={this.inputTaskFormValue}
          onBlur={(evt) => this.defaultTaskFormValue(evt)}
          onChange={this.putNameToState}
          maxLength="35"
        />
        <input className="btn btn--submit" type="submit" />
      </form>
    );
  }

  showTime(id) {
    const currentTask = this.state.tasks.filter((item) => item.id === id);

    const { current, total } = currentTask[0].time;
    const time = current + total;
    const { seconds, minutes, hours } = this.parseTimeForDisplay(time);

    let timeDisplay;

    if (hours > 0) {
      timeDisplay = `${hours}:${minutes}:${seconds}`;
    } else {
      timeDisplay = `${minutes}:${seconds}`;
    }

    return <>{timeDisplay}</>;
  }

  parseTimeForDisplay(timeInSeconds) {
    let seconds, minutes, hours;
    seconds = timeInSeconds;
    minutes = 0;
    hours = 0;

    if (seconds >= 60) {
      seconds %= 60;
      minutes = parseInt(timeInSeconds / 60);
    }

    if (minutes >= 60) {
      minutes %= 60;
      hours = parseInt(timeInSeconds / 60 ** 2);
    }

    [seconds, minutes] = [seconds, minutes].map((item) =>
      item.toString().padStart(2, "0")
    );

    return { seconds, minutes, hours };
  }

  timerStartCount(taskID) {
    const { currentTask } = this.getUpdatedTaskData(taskID);
    const { start } = currentTask.time;

    const { updatedTasks } = this.getUpdatedTaskData(taskID, {
      time: {
        current: parseInt((Date.now() - start) / 1000),
      },
    });

    this.setState({ tasks: updatedTasks });
  }

  handleTaskStart = (evt) => {
    const taskID = evt.currentTarget.closest("[id]").id;

    const intervalID = setInterval(
      this.timerStartCount.bind(this, taskID),
      1000
    );

    this.intervalIDList.push({ intervalID, id: taskID });
    const { updatedTasks } = this.getUpdatedTaskData(taskID, {
      isRunning: true,
      time: {
        start: Date.now(),
      },
    });
    this.setState({ tasks: updatedTasks });
  };

  handleTaskPause = (evt) => {
    const taskID = evt.currentTarget.closest("[id]").id;

    this.removeTimeInterval(taskID);

    const { time } = this.getTaskData(taskID);
    const { currentTask, updatedTasks } = this.getUpdatedTaskData(taskID, {
      isRunning: false,
      time: {
        current: 0,
        total: time.total + time.current,
      },
    });
    this.updateTaskData(taskID, currentTask, updatedTasks);
  };

  removeTimeInterval(taskID) {
    const { intervalIDList } = this;
    const matchedIntervals = intervalIDList.filter(
      (item) => item.id === taskID
    );

    matchedIntervals.forEach((item) => {
      clearInterval(item.intervalID);

      const indexOfInterval = intervalIDList.indexOf(item);
      intervalIDList.splice(indexOfInterval, 1);
    });
  }

  isTaskRunning(taskID) {
    const { tasks } = this.state;
    const [isRunning] = tasks
      .filter((item) => item.id === taskID)
      .map((item) => item.isRunning);
    return isRunning;
  }

  updateTaskData(taskID, currentTask, updatedTasks) {
    this.setState({ tasks: updatedTasks }, () => {
      this.fetchDataAPI.putData(taskID, currentTask);
    });
  }

  removeTask(taskID, updatedTasks) {
    this.setState({ tasks: updatedTasks }, () => {
      this.fetchDataAPI.deleteData(taskID);
    });
  }

  getTaskData(taskID) {
    const { tasks } = this.state;
    const copyTasks = this.createDeepCopy(tasks);

    let task;

    copyTasks.forEach((item) => {
      if (item.id === taskID) {
        task = item;
      }
    });

    return task;
  }

  getUpdatedTaskData(taskID, props) {
    const { tasks } = this.state;
    const copyTasks = this.createDeepCopy(tasks);

    let currentTask = null;

    copyTasks.forEach((item) => {
      if (item.id === taskID) {
        currentTask = this.changeObjectValues(item, props);
      }
    });

    const updatedTasks = copyTasks;
    return { currentTask, updatedTasks };
  }

  changeObjectValues(obj, values) {
    for (const key in values) {
      if (this.isPlainFilledObject(values[key])) {
        this.changeObjectValues(obj[key], values[key]);
      } else {
        obj[key] = values[key];
      }
    }

    return obj;
  }

  isPlainFilledObject(obj) {
    return (
      obj !== null &&
      typeof obj === "object" &&
      Object.getPrototypeOf(obj) === Object.prototype &&
      Object.keys(obj).length > 0
    );
  }

  createDeepCopy(item) {
    const deepCopy = JSON.parse(JSON.stringify(item));

    return deepCopy;
  }

  handleTaskEnd = (evt) => {
    const taskID = evt.currentTarget.closest("[id]").id;

    if (this.isTaskRunning(taskID)) {
      this.removeTimeInterval(taskID);
    }

    const { currentTask, updatedTasks } = this.getUpdatedTaskData(taskID, {
      isRunning: false,
      isDone: true,
    });
    this.updateTaskData(taskID, currentTask, updatedTasks);
  };

  handleTaskRemove = (evt) => {
    const taskID = evt.currentTarget.closest("[id]").id;
    if (this.isTaskRunning(taskID)) {
      this.removeTimeInterval(taskID);
    }

    const { updatedTasks } = this.getUpdatedTaskData(taskID, {
      isRemoved: true,
      time: {
        start: 0,
        current: 0,
        total: 0,
      }
    });

    this.removeTask(taskID, updatedTasks);
  };

  showTaskRemover = (evt) => {
    const taskRemover =
      evt.currentTarget.parentElement.querySelector(".taskRemover");
    taskRemover.classList.toggle("taskRemover--hidden");
  };

  BtnFormRemove() {
    return (
      <button
        className="btn btn--formRemove"
        onClick={() => this.resetTaskForm()}
      >
        <img className="btn__icon btn__icon--small" src={svgList.cross_icon} />
      </button>
    );
  }

  BtnAdd() {
    return (
      <button
        className="btn btn--add"
        onClick={() => this.displayTaskForm()}
        disabled={false}
      >
        <img className="btn__icon" src={svgList.plus_icon} />
      </button>
    );
  }

  BtnRemove() {
    return (
      <button
        className="btn btn--remove"
        onClick={this.handleTaskRemove}
        disabled={false}
      >
        <img className="btn__icon btn__icon--medium" src={svgList.bin_icon} />
      </button>
    );
  }

  BtnTaskRemover() {
    return (
      <button
        className="btn btn--taskRemover"
        onClick={this.showTaskRemover}
        disabled={false}
      >
        <img className="btn__icon btn__icon--small" src={svgList.cross_icon} />
      </button>
    );
  }

  BtnStart() {
    return (
      <button className="btn btn--start" onClick={this.handleTaskStart}>
        <img className="btn__icon" src={svgList.greaterThan_icon} />
      </button>
    );
  }

  BtnPause() {
    return (
      <button className="btn btn--pause" onClick={this.handleTaskPause}>
        <img className="btn__icon" src={svgList.equals_icon} />
      </button>
    );
  }

  BtnEnd() {
    return (
      <button className="btn btn--end" onClick={this.handleTaskEnd}>
        <img
          className="btn__icon btn__icon--medium"
          src={svgList.bookmark_icon}
        />
      </button>
    );
  }

  manageBtns(item) {
    if (item.isRunning) {
      return <>{this.BtnPause()}</>;
    }

    return <>{this.BtnStart()}</>;
  }

  TaskFooter(item) {
    return <footer className="task__footer">{this.manageBtns(item)}</footer>;
  }

  TaskRemover() {
    return (
      <section className="taskRemover taskRemover--hidden">
        <h2 className="taskRemover__header">
          What would you like to do with this task?
        </h2>
        <div className="taskRemover__container">
          {this.BtnEnd()}
          {this.BtnRemove()}
        </div>
      </section>
    );
  }

  TaskDoneRemover() {
    return (
      <section className="taskRemover taskRemover--hidden">
        <h2 className="taskRemover__header">
          Would you like to delete this task?
        </h2>
        <div className="taskRemover__container">{this.BtnRemove()}</div>
      </section>
    );
  }

  TaskHeader(item) {
    return (
      <header className="task__header">
        <div className="task__name">{item.name}</div>
        <div className="task__timer">{this.showTime(item.id)}</div>
      </header>
    );
  }

  TaskDoneHeader(item) {
    return (
      <header className="task__header">
        <div className="task__name">{item.name}</div>
        <div className="task__timer task__timer--done">
          {this.showTime(item.id)}
        </div>
      </header>
    );
  }

  TaskTemplate(item) {
    return (
      <section id={item.id} className="task">
        {this.BtnTaskRemover()}
        {this.TaskRemover()}
        {this.TaskHeader(item)}
        {this.TaskFooter(item)}
      </section>
    );
  }

  TaskDoneTemplate(item) {
    return (
      <section id={item.id} className="task task--done">
        {this.BtnTaskRemover()}
        {this.TaskDoneRemover()}
        {this.TaskDoneHeader(item)}
      </section>
    );
  }

  render() {
    return (
      <section className="root__wrapper">
        {this.TasksActive()}
        {this.TasksDone()}
      </section>
    );
  }

  TasksActive() {
    if (this.isThereAnActiveTask()) {
      return (
        <section className="tasksActive">
          {this.renderTask()}
          {this.NewTask()}
        </section>
      );
    } else {
      return <section className="tasksActive">{this.NewTask()}</section>;
    }
  }

  TasksDone() {
    if (this.isThereADoneTask()) {
      return (
        <section className="tasksDone">
          <h2 className="tasksDone__header">Finished Tasks</h2>
          {this.renderTaskDone()}
        </section>
      );
    }
  }

  isThereAnActiveTask() {
    const { tasks } = this.state;
    const doesExist = tasks.some((item) => !item.isDone && !item.isRemoved);

    return doesExist;
  }

  isThereADoneTask() {
    const { tasks } = this.state;
    const doesExist = tasks.some((item) => item.isDone && !item.isRemoved);

    return doesExist;
  }
}

export default TasksManager;
