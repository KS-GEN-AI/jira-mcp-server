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
                        },
                        parent: {
                            type: 'string',
                            description: 'The key of the parent ticket (the epic)'
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
                        labels: {
                            type: 'array',
                            items: {
                                type: 'string'
                            },
                            description: 'The labels of the ticket'
                        },
                        parent: {
                            type: 'string',
                            description: 'The key of the parent ticket (the epic)'
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
            },
            //query assignables to ticket
            {
                name: 'query_assignable',
                description: 'Query assignables to a ticket on Jira on the api /rest/api/3/user/assignable/search?project={project-name}',
                inputSchema: {
                    type: 'object',
                    properties: {
                        project_key: {
                            type: 'string',
                            description: 'The id of the project to search'
                        }
                    },
                    required: ['project_key']
                }
            },
            {
                name: 'add_attachment',
                description: 'Add an attachment to a ticket on Jira on the api /rest/api/3/issue/{issueIdOrKey}/attachments',
                inputSchema: {
                    type: 'object',
                    properties: {
                        issueIdOrKey: {
                            type: 'string',
                            description: 'The issue id or key'
                        },
                        imageUrl: {
                            type: 'string',
                            description: 'The URL of the image to attach'
                        }
                    },
                    required: ['issueIdOrKey', 'imageUrl']
                }
            }
        ]
    };
});

/**
 * Function to add an attachment to a Jira issue.
 * @param issueIdOrKey
 * @param imageUrl
 * @returns {Promise<any>}
 */
async function addAttachment(issueIdOrKey: string, imageUrl: string): Promise<any> {
    try {
        // Télécharger l'image depuis l'URL
        const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const formData = new FormData();
        formData.append('file', new Blob([imageResponse.data]), 'image.png');

        // Headers spéciaux pour l'upload de fichiers
        const headers = {
            ...getAuthHeaders().headers,
            'X-Atlassian-Token': 'no-check',
            'Content-Type': 'multipart/form-data'
        };

        const response = await axios.post(
            `${JIRA_URL}/rest/api/3/issue/${issueIdOrKey}/attachments`,
            formData,
            { headers }
        );

        return response.data;
    } catch (error: any) {
        return {
            error: error.response?.data || error.message
        };
    }
}


/**
 * Function to query assignable users for a project.
 * @param {string} project_key - The project key to query assignable users for.
 * @returns {Promise<any>}
 */
async function queryAssignable(project_key: string): Promise<any> {
    try {
        const params = {
            project: project_key,  // JQL query string
        };

        const response = await axios.get(`${JIRA_URL}/rest/api/3/user/assignable/search`, {
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


/**
 * Function to execute a JQL query against Jira.
 * @param {string} jql - JQL query string
 * @param maxResults
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

/**
 * Function to create a ticket on Jira.
 * @param project
 * @param summary
 * @param description
 * @param issuetype
 * @param parentID
 */
async function createTicket(project: string, summary: string, description: string, issuetype: string, parentID?: string): Promise<any> {
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

        //parent is somethng like "parent": {"key": "SCRUM-19"}
        const parent = parentID ? {key: parentID} : undefined;

        const response = await axios.post(`${JIRA_URL}/rest/api/3/issue`, {
            fields: {
                project: {
                    key: project
                },
                summary,
                description: description ? jiraDescription : undefined,
                issuetype: {
                    name: issuetype
                },
                parent
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

/**
 * Function to get the authentication headers.
 * @returns {AxiosRequestConfig}
 */
function getAuthHeaders(): AxiosRequestConfig<any> {
    const authHeader = `Basic ${Buffer.from(`${JIRA_API_MAIL}:${JIRA_API_KEY}`).toString('base64')}`;
    return {
        headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
        }
    };
}

/** Function to list all projects on Jira.
 * @returns {Promise<any>}
 * @param number_of_results
 */
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

/**
 * Function to delete a ticket on Jira.
 * @param issueIdOrKey
 * @returns {Promise<any>}
 */
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

/**
 * Function to edit a ticket on Jira.
 * @param issueIdOrKey
 * @param summary
 * @param description
 * @param labels
 * @param parent
 * @returns {Promise<any>}
 */
async function editTicket(issueIdOrKey?: string, summary?: string, description?: string, labels?: string[], parent?: string): Promise<any> {
    try {
        const descriptionToSend = description || 'No description provided';

        const jiraDescription =
            description === null ? undefined :
                {
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

        const parentToSend = parent ? {key: parent} : undefined;

        //we create the fields object with only the present fields
        const fields = {
            summary: summary,
            description: jiraDescription,
            labels: labels,
            parent: parentToSend
        }

        const response = await axios.put(`${JIRA_URL}/rest/api/3/issue/${issueIdOrKey}`, {
            fields: fields
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

/**
 * Function to get all the statuses on Jira.
 * @param number_of_results
 * @returns {Promise<any>}
 */
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

/**
 * Function to assign a ticket to a user.
 * @param accountId
 * @param issueIdOrKey
 * @returns {Promise<any>}
 */
async function assignTicket(accountId: string, issueIdOrKey: string): Promise<any> {
    try {
        const response = await axios.put(`${JIRA_URL}/rest/api/3/issue/${issueIdOrKey}/assignee`, {
            accountId
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
            const parent: any = request.params.arguments?.parent;

            if (!project || !summary || !description || !issuetype) {
                throw new Error('Project, summary, description and issuetype are required');
            }

            try {
                const response = await createTicket(project.key, summary, description, issuetype.name, parent);

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

            const response = await listProjects(number_of_results);

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify(response, null, 2)
                }]
            };
        }

        case 'delete_ticket': {
            const issueIdOrKey: any = request.params.arguments?.issueIdOrKey;

            if (!issueIdOrKey) {
                throw new Error('Issue id or key is required');
            }

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
            const labels: any = request.params.arguments?.labels;
            const parent: any = request.params.arguments?.parent;

            if (!issueIdOrKey) {
                throw new Error('Issue id or key is required');
            }

            const response = await editTicket(issueIdOrKey, summary, description, labels, parent);

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify(response, null, 2)
                }]
            };

        case 'get_all_statuses': {
            const number_of_results = Number(request.params.arguments?.number_of_results ?? 50);

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

            const response = await assignTicket(accountId, issueIdOrKey);

            return {
                content: [{
                    type: 'text',
                    text: "Ticket assigned : " + JSON.stringify(response, null, 2)
                }]
            };
        }

        case 'query_assignable': {
            const project_key: any = request.params.arguments?.project_key;

            if (!project_key) {
                throw new Error('Query is required');
            }

            const response = await queryAssignable(project_key);

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify(response, null, 2)
                }]
            };
        }


        case 'add_attachment': {
            const issueIdOrKey: any = request.params.arguments?.issueIdOrKey;
            const imageUrl: any = request.params.arguments?.imageUrl;

            if (!issueIdOrKey || !imageUrl) {
                throw new Error('Issue id or key and image URL are required');
            }

            const response = await addAttachment(issueIdOrKey, imageUrl);

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify(response, null, 2)
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

