import React, { useState, useEffect, useRef, useCallback } from 'react';
import TextWrapper from './TextWrapper';
import MultiMessage from './MultiMessage';
import { useSelector, useDispatch } from 'react-redux';
import HoverButtons from './HoverButtons';
import SiblingSwitch from './SiblingSwitch';
import { setError } from '~/store/convoSlice';
import { setMessages } from '~/store/messageSlice';
import { setSubmitState, setSubmission } from '~/store/submitSlice';
import { setText } from '~/store/textSlice';
import { setConversation } from '../../store/convoSlice';
import { getIconOfModel } from '../../utils';

export default function Message({
  message,
  messages,
  scrollToBottom,
  currentEditId,
  setCurrentEditId,
  siblingIdx,
  siblingCount,
  setSiblingIdx
}) {
  const { isSubmitting, model, chatGptLabel, promptPrefix } = useSelector(
    (state) => state.submit
  );
  const [abortScroll, setAbort] = useState(false);
  const { sender, text, isCreatedByUser, error, submitting } = message;
  const textEditor = useRef(null);
  const convo = useSelector((state) => state.convo);
  const { initial } = useSelector((state) => state.models);
  const { error: convoError } = convo;
  const last = !message?.children?.length;
  const edit = message.messageId == currentEditId;
  const dispatch = useDispatch();

  // const notUser = !isCreatedByUser; // sender.toLowerCase() !== 'user';
  const blinker = submitting && isSubmitting && last && !isCreatedByUser;
  const generateCursor = useCallback(() => {
    if (!blinker) {
      return '';
    }

    return <span className="result-streaming">█</span>;
  }, [blinker]);

  useEffect(() => {
    if (blinker && !abortScroll) {
      scrollToBottom();
    }
  }, [isSubmitting, text, blinker, scrollToBottom, abortScroll]);

  useEffect(() => {
    if (last) dispatch(setConversation({ parentMessageId: message?.messageId }));
  }, [last]);

  const enterEdit = (cancel) => setCurrentEditId(cancel ? -1 : message.messageId);

  const handleWheel = () => {
    if (blinker) {
      setAbort(true);
    } else {
      setAbort(false);
    }
  };

  const props = {
    className:
      'w-full border-b border-black/10 dark:border-gray-900/50 text-gray-800 bg-white dark:text-gray-100 group dark:bg-gray-800'
  };

  const icon = getIconOfModel({
    sender,
    isCreatedByUser,
    model,
    chatGptLabel,
    promptPrefix,
    error
  });

  if (!isCreatedByUser)
    props.className =
      'w-full border-b border-black/10 bg-gray-50 dark:border-gray-900/50 text-gray-800 dark:text-gray-100 group bg-gray-100 dark:bg-[#444654]';

  // const wrapText = (text) => <TextWrapper text={text} generateCursor={generateCursor}/>;

  const resubmitMessage = () => {
    const text = textEditor.current.innerText;

    if (convoError) {
      dispatch(setError(false));
    }

    if (!!isSubmitting || text.trim() === '') {
      return;
    }

    // this is not a real messageId, it is used as placeholder before real messageId returned
    const fakeMessageId = crypto.randomUUID();
    const isCustomModel = model === 'chatgptCustom' || !initial[model];
    const currentMsg = {
      sender: 'User',
      text: text.trim(),
      current: true,
      isCreatedByUser: true,
      parentMessageId: message?.parentMessageId,
      conversationId: message?.conversationId,
      messageId: fakeMessageId
    };
    const sender = model === 'chatgptCustom' ? chatGptLabel : model;

    const initialResponse = {
      sender,
      text: '',
      parentMessageId: fakeMessageId,
      submitting: true
    };

    dispatch(setSubmitState(true));
    dispatch(setMessages([...messages, currentMsg, initialResponse]));
    dispatch(setText(''));

    const submission = {
      isCustomModel,
      message: {
        ...currentMsg,
        model,
        chatGptLabel,
        promptPrefix
      },
      messages: messages,
      currentMsg,
      initialResponse,
      sender
    };
    console.log('User Input:', currentMsg?.text);
    // handleSubmit(submission);
    dispatch(setSubmission(submission));

    setSiblingIdx(siblingCount - 1);
    enterEdit(true);
  };

  return (
    <>
      <div
        {...props}
        onWheel={handleWheel}
      >
        <div className="relative m-auto flex gap-4 p-4 text-base md:max-w-2xl md:gap-6 md:py-6 lg:max-w-2xl lg:px-0 xl:max-w-3xl">
          <div className="relative flex h-[30px] w-[30px] flex-col items-end text-right text-xs md:text-sm">
            {typeof icon === 'string' && icon.match(/[^\u0000-\u007F]+/) ? (
              <span className=" direction-rtl w-40 overflow-x-scroll">{icon}</span>
            ) : (
              icon
            )}
            <div className="sibling-switch invisible absolute left-0 top-2 -ml-4 flex -translate-x-full items-center justify-center gap-1 text-xs group-hover:visible">
              <SiblingSwitch
                siblingIdx={siblingIdx}
                siblingCount={siblingCount}
                setSiblingIdx={setSiblingIdx}
              />
            </div>
          </div>
          <div className="relative flex w-[calc(100%-50px)] flex-col gap-1 whitespace-pre-wrap md:gap-3 lg:w-[calc(100%-115px)]">
            <div className="flex flex-grow flex-col gap-3">
              {error ? (
                <div className="flex flex min-h-[20px] flex-grow flex-col items-start gap-4 gap-2 whitespace-pre-wrap text-red-500">
                  <div className="rounded-md border border-red-500 bg-red-500/10 py-2 px-3 text-sm text-gray-600 dark:text-gray-100">
                    {`An error occurred. Please try again in a few moments.\n\nError message: ${text}`}
                  </div>
                </div>
              ) : edit ? (
                <div className="flex min-h-[20px] flex-grow flex-col items-start gap-4 whitespace-pre-wrap">
                  {/* <div className={`${blinker ? 'result-streaming' : ''} markdown prose dark:prose-invert light w-full break-words`}> */}

                  <div
                    className="markdown prose dark:prose-invert light w-full break-words border-none focus:outline-none"
                    contentEditable={true}
                    ref={textEditor}
                    suppressContentEditableWarning={true}
                  >
                    {text}
                  </div>
                  <div className="mt-2 flex w-full justify-center text-center">
                    <button
                      className="btn btn-primary relative mr-2"
                      disabled={isSubmitting}
                      onClick={resubmitMessage}
                    >
                      Save & Submit
                    </button>
                    <button
                      className="btn btn-neutral relative"
                      onClick={() => enterEdit(true)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[20px] flex-grow flex-col items-start gap-4 whitespace-pre-wrap">
                  {/* <div className={`${blinker ? 'result-streaming' : ''} markdown prose dark:prose-invert light w-full break-words`}> */}
                  <div className="markdown prose dark:prose-invert light w-full break-words">
                    {!isCreatedByUser ? (
                      <TextWrapper
                        text={text}
                        generateCursor={generateCursor}
                      />
                    ) : (
                      text
                    )}
                  </div>
                </div>
              )}
            </div>
            <HoverButtons
              model={model}
              visible={!error && isCreatedByUser && !edit}
              onClick={() => enterEdit()}
            />
            <div className="sibling-switch-container flex justify-between">
              <div className="flex items-center justify-center gap-1 self-center pt-2 text-xs">
                <SiblingSwitch
                  siblingIdx={siblingIdx}
                  siblingCount={siblingCount}
                  setSiblingIdx={setSiblingIdx}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <MultiMessage
        messageList={message.children}
        messages={messages}
        scrollToBottom={scrollToBottom}
        currentEditId={currentEditId}
        setCurrentEditId={setCurrentEditId}
      />
    </>
  );
}
