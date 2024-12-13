#!/usr/bin/env node

import axios, {AxiosRequestConfig} from 'axios';
import {Server} from "@modelcontextprotocol/sdk/server/index.js";
import {StdioServerTransport} from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

/**
 * Configure your Jira instance credentials and URL.
 */
const JIRA_URL = process.env.JIRA_URL;
const JIRA_API_MAIL = process.env.JIRA_API_MAIL;
const JIRA_API_KEY = process.env.JIRA_API_KEY;



/**
 * Create an MCP server to handle JQL queries.
 */
const server = new Server(
    {
        name: "Jira communication server",
        version: "0.1.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

/**
 * Handler for listing available tools.
 * Provides a tool to execute a JQL query against Jira.
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "execute_jql",
                description: "Execute a JQL query on Jira on the api /rest/api/3/search",
                inputSchema: {
                    type: "object",
                    properties: {
                        jql: {
                            type: "string",
                            description: "JQL query string"
                        },
                        number_of_results: {
                            type: "integer",
                            description: "Number of results to return",
                            default: 1,
                        }
                    },
                    required: ["jql"]
                }
            },
            //as the previous tool gets everything in the ticket, we can create a new tool to get only the ticket name and description to fit more in the context of the assistant
            {
                name: "get_only_ticket_name_and_description",
                description: "Get the name and description of the requested tickets on the api /rest/api/3/search",
                inputSchema: {
                    type: "object",
                    properties: {
                        jql: {
                            type: "string",
                            description: "JQL query string"
                        },
                        number_of_results: {
                            type: "integer",
                            description: "Number of results to return",
                            default: 1,
                        }
                    },
                    required: ["jql"]
                }
            },
            {
                name: 'create_ticket',
                description: 'Create a ticket on Jira on the api /rest/api/3/issue',
                inputSchema: {
                    type: 'object',
                    properties: {
                        project: {
                            type: 'object',
                            properties: {
                                key: {
                                    type: 'string',
                                    description: 'The project key'
                                }
                            },
                            required: ['key']
                        },
                        summary: {
                            type: 'string',
                            description: 'The summary of the ticket'
                        },
                        description: {
                            type: 'string',
                            description: 'The description of the ticket'
                        },
                        issuetype: {
                            type: 'object',
                            properties: {
                                name: {
                                    type: 'string',
                                    description: 'The name of the issue type'
                                }
                            },
                            required: ['name']
                        }
                    },
                    required: ['project', 'summary', 'description', 'issuetype']
                }
            },
            //liste les projets
            {
                name: 'list_projects',
                description: 'List all the projects on Jira on the api /rest/api/3/project',
                inputSchema: {
                    type: 'object',
                    properties: {
                        number_of_results: {
                            type: 'integer',
                            description: 'Number of results to return',
                            default: 1
                        }
                    }
                }
            },
            //delete a ticket
            {
                name: 'delete_ticket',
                description: 'Delete a ticket on Jira on the api /rest/api/3/issue/{issueIdOrKey}',
                inputSchema: {
                    type: 'object',
                    properties: {
                        issueIdOrKey: {
                            type: 'string',
                            description: 'The issue id or key'
                        }
                    },
                    required: ['issueIdOrKey']
                }
            },
            //edit ticket : name, description, assignee, priority, labels, components, custom fields
            {
                name: 'edit_ticket',
                description: 'Edit a ticket on Jira on the api /rest/api/3/issue/{issueIdOrKey}',
                inputSchema: {
                    type: 'object',
                    properties: {
                        issueIdOrKey: {
                            type: 'string',
                            description: 'The issue id or key'
                        },
                        summary: {
                            type: 'string',
                            description: 'The summary of the ticket'
                        },
                        description: {
                            type: 'string',
                            description: 'The description of the ticket'
                        },
                        assignee: {
                            type: 'object',
                            properties: {
                                name: {
                                    type: 'string',
                                    description: 'The name of the assignee'
                                }
                            }
                        },
                        priority: {
                            type: 'object',
                            properties: {
                                name: {
                                    type: 'string',
                                    description: 'The name of the priority'
                                }
                            }
                        },
                        labels: {
                            type: 'array',
                            items: {
                                type: 'string'
                            },
                            description: 'The labels of the ticket'
                        },
                        components: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    name: {
                                        type: 'string',
                                        description: 'The name of the component'
                                    }
                                }
                            },
                            description: 'The components of the ticket'
                        },
                        custom_fields: {
                            type: 'object',
                            properties: {
                                name: {
                                    type: 'string',
                                    description: 'The name of the custom field'
                                },
                                value: {
                                    type: 'string',
                                    description: 'The value of the custom field'
                                }
                            },
                            description: 'The custom fields of the ticket'
                        }
                    },
                    required: ['issueIdOrKey']
                }
            },
            //get all status
            {
                name: 'get_all_statuses',
                description: 'Get all the status on Jira on the api /rest/api/3/status',
                inputSchema: {
                    type: 'object',
                    properties: {
                        number_of_results: {
                            type: 'integer',
                            description: 'Number of results to return',
                            default: 1
                        }
                    }
                }
            },
            //assign ticket
            {
                name: 'assign_ticket',
                description: 'Assign a ticket on Jira on the api /rest/api/3/issue/{issueIdOrKey}/assignee',
                inputSchema: {
                    type: 'object',
                    properties: {
                        accountId: {
                            type: 'string',
                            description: 'The account id of the assignee'
                        },
                        issueIdOrKey: {
                            type: 'string',
                            description: 'The issue id or key'
                        }
                    },
                    required: ['accountId', 'issueIdOrKey']
                }
            }
        ]
    };
});

/**
 * Function to execute a JQL query against Jira.
 * @param {string} jql - JQL query string
 * @returns {Promise<any>}
 */
async function executeJQL(jql: string, maxResults: number): Promise<any> {
    try {
        const params = {
            jql,  // JQL query string
            maxResults,  // Adjust as needed
        };


        const response = await axios.get(`${JIRA_URL}/rest/api/3/search`, {
            headers: getAuthHeaders().headers,
            params
        });

        return response.data;
    } catch (error: any) {
        //return the error in a json
        return {
            error: error.response.data
        };
    }
}

async function createTicket(project: string, summary: string, description: string, issuetype: string): Promise<any> {
    try {
        const jiraDescription = {
            "type": "doc",
            "version": 1,
            "content": [
                {
                    "type": "paragraph",
                    "content": [
                        {
                            "type": "text",
                            "text": description
                        }
                    ]
                }
            ]
        }

        const response = await axios.post(`${JIRA_URL}/rest/api/3/issue`, {
            fields: {
                project: {
                    key: project
                },
                summary,
                description: description? jiraDescription : undefined,
                issuetype: {
                    name: issuetype
                }
            }
        }, {
            headers: getAuthHeaders().headers,
        });

        return response.data;
    } catch (error: any) {
        return {
            error: error.response.data
        };
    }
}

function getAuthHeaders(): AxiosRequestConfig<any> {
    const authHeader = `Basic ${Buffer.from(`${JIRA_API_MAIL}:${JIRA_API_KEY}`).toString('base64')}`;
    return {
        headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
        }
    };
}

async function listProjects(number_of_results: number): Promise<any> {
    try {
        const params = {
            maxResults: number_of_results,  // Adjust as needed
        };


        const response = await axios.get(`${JIRA_URL}/rest/api/3/project`, {
            headers: getAuthHeaders().headers,
            params
        });

        return response.data;
    } catch (error: any) {
        //return the error in a json
        return {
            error: error.response.data
        };
    }
}

async function deleteTicket(issueIdOrKey: string): Promise<any> {
    try {
        const response = await axios.delete(`${JIRA_URL}/rest/api/3/issue/${issueIdOrKey}`, {
            headers: getAuthHeaders().headers,
        });
        return response.data;
    } catch (error: any) {
        return {
            error: error.response.data
        };
    }
}

//only modify the fields that are not null, if they are null, they will not be modified
async function editTicket(issueIdOrKey?: string, summary?: string, description?: string, priority?: string, labels?: string[], components?: string[], custom_fields?: any): Promise<any> {
    try {
        //corect put object :// This sample uses Atlassian Forge
        // // https://developer.atlassian.com/platform/forge/
        // import api, { route } from "@forge/api";
        //
        // var bodyData = `{
        //   "fields": {
        //     "customfield_10000": {
        //       "content": [
        //         {
        //           "content": [
        //             {
        //               "text": "Investigation underway",
        //               "type": "text"
        //             }
        //           ],
        //           "type": "paragraph"
        //         }
        //       ],
        //       "type": "doc",
        //       "version": 1
        //     },
        //     "customfield_10010": 1,
        //     "summary": "Completed orders still displaying in pending"
        //   },
        //   "historyMetadata": {
        //     "activityDescription": "Complete order processing",
        //     "actor": {
        //       "avatarUrl": "http://mysystem/avatar/tony.jpg",
        //       "displayName": "Tony",
        //       "id": "tony",
        //       "type": "mysystem-user",
        //       "url": "http://mysystem/users/tony"
        //     },
        //     "cause": {
        //       "id": "myevent",
        //       "type": "mysystem-event"
        //     },
        //     "description": "From the order testing process",
        //     "extraData": {
        //       "Iteration": "10a",
        //       "Step": "4"
        //     },
        //     "generator": {
        //       "id": "mysystem-1",
        //       "type": "mysystem-application"
        //     },
        //     "type": "myplugin:type"
        //   },
        //   "properties": [
        //     {
        //       "key": "key1",
        //       "value": "Order number 10784"
        //     },
        //     {
        //       "key": "key2",
        //       "value": "Order number 10923"
        //     }
        //   ],
        //   "update": {
        //     "components": [
        //       {
        //         "set": ""
        //       }
        //     ],
        //     "labels": [
        //       {
        //         "add": "triaged"
        //       },
        //       {
        //         "remove": "blocker"
        //       }
        //     ],
        //     "summary": [
        //       {
        //         "set": "Bug in business logic"
        //       }
        //     ],
        //     "timetracking": [
        //       {
        //         "edit": {
        //           "originalEstimate": "1w 1d",
        //           "remainingEstimate": "4d"
        //         }
        //       }
        //     ]
        //   }
        // }`;
        //
        // const response = await api.asUser().requestJira(route`/rest/api/3/issue/{issueIdOrKey}`, {
        //   method: 'PUT',
        //   headers: {
        //     'Accept': 'application/json',
        //     'Content-Type': 'application/json'
        //   },
        //   body: bodyData
        // });
        //
        // console.log(`Response: ${response.status} ${response.statusText}`);
        // console.log(await response.json());
        const descriptionToSend = description || 'No description provided';

        const jiraDescription = {
            "type": "doc",
            "version": 1,
            "content": [
                {
                    "type": "paragraph",
                    "content": [
                        {
                            "type": "text",
                            "text": descriptionToSend
                        }
                    ]
                }
            ]
        }

        //we create the fields object with only the present fields
        const fields = {
            summary: summary,
            description: jiraDescription,
            priority: priority ? {name: priority} : undefined,
            labels: labels,
            components: components,
        }

        const response = await axios.put(`${JIRA_URL}/rest/api/3/issue/${issueIdOrKey}`, {
            fields: fields
        }, {
            headers: getAuthHeaders().headers,
        });

        return response.data;

    }catch (error: any) {
        return {
            error: error.response.data
        };
    }

}

async function getAllStatus(number_of_results: number): Promise<any> {
    try {
        const params = {
            maxResults: number_of_results,  // Adjust as needed
        };

        const response = await axios.get(`${JIRA_URL}/rest/api/3/status`, {
            headers: getAuthHeaders().headers,
            params
        });

        return response.data;
    } catch (error: any) {
        //return the error in a json
        return {
            error: error.response.data
        };
    }
}

async function assignTicket(accountId: string, issueIdOrKey: string): Promise<any> {
    try {
        const response = await axios.put(`${JIRA_URL}/rest/api/3/issue/${issueIdOrKey}/assignee`, {
            accountId
        }, {
            headers: getAuthHeaders().headers,
        });

        return response;
    } catch (error: any) {
        return {
            error: error.response.data
        };
    }
}
/**
 * Handler for the execute_jql tool.
 * Executes a JQL query and returns the full response.
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {

    switch (request.params.name) {
        case "execute_jql": {
            const jql = String(request.params.arguments?.jql);
            const number_of_results = Number(request.params.arguments?.number_of_results ?? 1);

            if (!jql) {
                throw new Error("JQL query is required");
            }


            console.log(`Executing JQL query: ${jql}`);

            const response = await executeJQL(jql, number_of_results);

            // Return the entire data from the response
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify(response, null, 2) // Pretty print JSON
                }]
            };
        }

        case "get_only_ticket_name_and_description": {
            const jql = String(request.params.arguments?.jql);
            const number_of_results = Number(request.params.arguments?.number_of_results ?? 1);

            if (!jql) {
                throw new Error("JQL query is required");
            }

            console.log(`Executing JQL query: ${jql}`);

            const response = await executeJQL(jql, number_of_results);

            // Return only the ticket name and description
            const tickets = response.issues.map((issue: any) => {
                return {
                    key: issue.key,
                    summary: issue.fields.summary,
                    description: issue.fields.description
                };
            });

            return {
                content: [{
                    type: "text",
                    text: JSON.stringify(tickets, null, 2) // Pretty print JSON
                }]
            };
        }

        case 'create_ticket': {
            const project: any = request.params.arguments?.project;
            const summary: any = request.params.arguments?.summary;
            const description: any = request.params.arguments?.description;
            const issuetype: any = request.params.arguments?.issuetype;

            if (!project || !summary || !description || !issuetype) {
                throw new Error('Project, summary, description and issuetype are required');
            }

            console.log(`Creating ticket with summary: ${summary}`);

            try {
                const response = await createTicket(project.key, summary, description, issuetype.name);

                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify(response, null, 2)
                    }]
                };
            } catch (error: any) {
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify(error.response.data, null, 2)
                    }]
                };
            }
        }

        case 'list_projects': {
            const number_of_results = Number(request.params.arguments?.number_of_results ?? 1);

            console.log('Listing projects');

            const response = await listProjects(number_of_results);

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify(response, null, 2)
                }]
            };
        }

        case 'delete_ticket': {
            const issueIdOrKey :any = request.params.arguments?.issueIdOrKey;

            if (!issueIdOrKey) {
                throw new Error('Issue id or key is required');
            }

            console.log(`Deleting ticket with id or key: ${issueIdOrKey}`);

            const response = await deleteTicket(issueIdOrKey);

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify(response, null, 2)
                }]
            };
        }

        case 'edit_ticket':
            const issueIdOrKey: any = request.params.arguments?.issueIdOrKey;
            const summary: any = request.params.arguments?.summary;
            const description: any = request.params.arguments?.description;
            const priority: any = request.params.arguments?.priority;
            const labels: any = request.params.arguments?.labels;
            const components: any = request.params.arguments?.components;
            const custom_fields: any = request.params.arguments?.custom_fields;

            if (!issueIdOrKey) {
                throw new Error('Issue id or key is required');
            }

            console.log(`Editing ticket with id or key: ${issueIdOrKey}`);

            const response = await editTicket(issueIdOrKey, summary, description, priority, labels, components, custom_fields);

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify(response, null, 2)
                }]
            };

        case 'get_all_statuses': {
            const number_of_results = Number(request.params.arguments?.number_of_results ?? 50);

            console.log('Getting all status');

            const response = await getAllStatus(number_of_results);

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify(response, null, 2)
                }]
            };
        }

        case 'assign_ticket': {
            const accountId: any = request.params.arguments?.accountId;
            const issueIdOrKey: any = request.params.arguments?.issueIdOrKey;

            if (!accountId || !issueIdOrKey) {
                throw new Error('Account id and issue id or key are required');
            }

            console.log(`Assigning ticket with id or key: ${issueIdOrKey}`);

            const response = await assignTicket(accountId, issueIdOrKey);

            return {
                content: [{
                    type: 'text',
                    text: "Ticket assigned : " + JSON.stringify(response, null, 2)
                }]
            };
        }
        default:
            throw new Error("Unknown tool");
    }
});

/**
 * Start the server using stdio transport.
 */
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});

