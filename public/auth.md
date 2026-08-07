# auth.md

Agent access policy for the personal website of Arbaz Siddiqui.

## Agent audience

AI assistants, crawlers and automated agents reading public content: projects, resume, writing.

## Agent registration

Not required. There is no registration endpoint, no account creation and no approval step. Agents access every resource anonymously, the same way browsers do.

## Credentials

None issued and none accepted. There are no protected resources, no OAuth authorization server, no API keys. Requests carry no credentials.

## Supported access method

Plain anonymous HTTPS GET. Machine-readable entry points are listed at [/.well-known/api-catalog](/.well-known/api-catalog) and described in [/openapi.json](/openapi.json). A plain-text site summary lives at [/llms.txt](/llms.txt).

## Contact

A human reads arbaz00@gmail.com.
