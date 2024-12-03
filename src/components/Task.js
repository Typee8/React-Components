import TaskRemoverBtn from "./TaskRemoverBtn";
import TaskRemover from "./TaskRemover";
import StartBtn from "./StartBtn";
import PauseBtn from "./PauseBtn";
import { useState } from "react";

export default function Task({ id, title, time }) {
  const [isTaskRemoverOpen, setIsTaskRemoverOpen] = useState(false);
  const [intervalID, setIntervalId] = useState();
  const [savedTimes, setSavedTimes] = useState(time);
  const [isRunning, setIsRunning] = useState(false);

  function showTime(time) {
    const { seconds, minutes, hours } = convertTimeFromSeconds(time.current);

    let timeDisplay;
    hours > 0
      ? (timeDisplay = `${hours}:${minutes}:${seconds}`)
      : (timeDisplay = `${minutes}:${seconds}`);

    return <>{timeDisplay}</>;
  }

  function convertTimeFromSeconds(timeInSeconds) {
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

  function handleTaskStart() {
    const { current } = savedTimes;
    const startTime = Date.now();
    const newIntervalID = setInterval(() => {
      setSavedTimes({
        ...savedTimes,
        current: current + parseInt((Date.now() - startTime) / 1000),
      });
    }, 1000);
    clearInterval(intervalID);
    setIntervalId(newIntervalID);
    setIsRunning(true);
  }

  function handleTaskPause(evt) {
    clearInterval(intervalID);
    setIsRunning(false);
  }

  return (
    <section id={id} className="task">
      <TaskRemoverBtn
        className="task__btn task__btn--taskRemover"
        onClick={() =>
          isTaskRemoverOpen
            ? setIsTaskRemoverOpen(false)
            : setIsTaskRemoverOpen(true)
        }
        isDisabled={false}
      />
      <TaskRemover isOpen={isTaskRemoverOpen} />
      <header className="task__header">
        <div className="task__title">{title}</div>
        <div className="task__timer">{showTime(savedTimes)}</div>
      </header>
      <footer className="task__footer">
        {isRunning ? (
          <PauseBtn
            className="task__btn task__btn--pause"
            onClick={handleTaskPause}
          />
        ) : (
          <StartBtn
            className="task__btn task__btn--start"
            onClick={handleTaskStart}
          />
        )}
      </footer>
    </section>
  );
}
