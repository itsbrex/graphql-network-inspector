import React from "react";
import copy from "copy-to-clipboard";
import classes from "./NetworkPanel.module.css";
import { CodeBlock } from "../../components/CodeBlock";
import { JsonView } from "../../components/JsonView";
import { Tabs } from "../../components/Tabs";
import { CloseIcon } from "../../components/Icons/CloseIcon";
import { NetworkRequest } from "../../hooks/useNetworkMonitor";
import * as safeJson from "../../helpers/safeJson";

export type NetworkPanelProps = {
  data: NetworkRequest;
  onClose: () => void;
};

export const NetworkPanel = (props: NetworkPanelProps) => {
  const { data, onClose } = props;
  const requestBody = data.request.body;
  const responseBody = data.response?.body;

  return (
    <div data-testid="network-tabs">
      <Tabs
        leftContent={
          <button
            onClick={onClose}
            className={classes.closeButton}
            data-testid="close-side-panel"
          >
            <CloseIcon />
          </button>
        }
        tabs={[
          {
            title: "Request",
            component: (
              <div>
                {requestBody.map(({ query, variables }) => (
                  <div key={query} className={classes.query}>
                    <h2 className={classes.subtitle}>Request</h2>
                    <CodeBlock text={query} language={"graphql"} />
                    <h2 className={classes.subtitle}>Variables</h2>
                    <CodeBlock
                      text={
                        safeJson.stringify(variables || {}, undefined, 4) || ""
                      }
                      language={"json"}
                    />
                  </div>
                ))}
              </div>
            ),
          },
          {
            title: "Response",
            component: <JsonView src={safeJson.parse(responseBody) || {}} />,
          },
          {
            title: "Response (Raw)",
            component: (
              <>
                <CodeBlock
                  text={
                    safeJson.stringify(
                      safeJson.parse(responseBody) || {},
                      undefined,
                      4
                    ) || ""
                  }
                  language={"json"}
                />
                <button
                  onClick={() => {
                    copy(`${safeJson.parse(responseBody)}`);
                  }}
                >
                  Copy Response
                </button>
              </>
            ),
          },
        ]}
      />
    </div>
  );
};
